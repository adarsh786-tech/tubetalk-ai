import os
import re
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from youtube_transcript_api import YouTubeTranscriptApi
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_qdrant import QdrantVectorStore
from langchain_core.documents import Document
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()
app = FastAPI()

frontend_url = os.getenv("FRONTEND_URL", "")
# Create a list of allowed origins, including both development and production URLs
allowed_origins = [
    frontend_url,
    "http://localhost:3000",
    "https://localhost:3000",
    "http://127.0.0.1:3000",
]

# Add any additional URLs from environment if provided
if frontend_url and frontend_url not in allowed_origins:
    allowed_origins.append(frontend_url)

print(f"CORS Origins allowed: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app$",  # Allow all Vercel preview deployments
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["Content-Type"],
    max_age=86400,  # Cache CORS preflight requests for 24 hours
)

# Models for request data
class VideoURLRequest(BaseModel):
    youtube_url: str

class QuestionRequest(BaseModel):
    video_id: str
    question: str

# In-memory cache (you could persist or use Redis etc. in production)
VIDEO_DATA_CACHE = {}

def extract_video_id(youtube_url):
    video_id_match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11}).*", youtube_url)
    return video_id_match.group(1) if video_id_match else None

def create_video_summary(all_chunks, llmModel, video_id):
    total_chunks = len(all_chunks)
    if total_chunks > 50:
        sampled_chunks = all_chunks[:10] + all_chunks[total_chunks//2-5:total_chunks//2+5] + all_chunks[-10:]
    else:
        sampled_chunks = all_chunks

    combined_content = "\n".join([f"[{chunk.metadata.get('timestamp')}] {chunk.page_content}" for chunk in sampled_chunks])
    messages = [
        ("system", "Create a comprehensive summary of this YouTube video transcript. Focus on the main topics, key points, and overall structure of the video."),
        ("human", combined_content)
    ]
    return llmModel.invoke(messages).content

def setup_video_bot(video_url: str, llmModel):
    video_id = extract_video_id(video_url)
    if not video_id:
        raise ValueError("Invalid YouTube URL")

    transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
    transcript_docs = []

    for entry in transcript:
        start_time = entry['start']
        text = entry['text']
        minutes, seconds = divmod(start_time, 60)
        hours, minutes = divmod(minutes, 60)
        timestamp = f"{int(hours):02d}:{int(minutes):02d}:{seconds:.2f}"
        transcript_docs.append(Document(
            page_content=text,
            metadata={"timestamp": timestamp, "video_id": video_id}
        ))

    embedder = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
    vector_store = QdrantVectorStore.from_documents(
        documents=transcript_docs,
        collection_name=f"yt-{video_id}",
        embedding=embedder,
        url=os.getenv("QDRANT_URL"),
        api_key=os.getenv("QDRANT_API_KEY")
    )

    summary = create_video_summary(transcript_docs, llmModel, video_id)
    full_transcript = "\n".join([f"[{doc.metadata.get('timestamp')}] {doc.page_content}" for doc in transcript_docs])

    return {
        "video_id": video_id,
        "vector_store": vector_store,
        "embedder": embedder,
        "transcript_docs": transcript_docs,
        "summary": summary,
        "full_transcript": full_transcript
    }

def process_query(query, llmModel, system_prompt):
    messages = [
        ("system", system_prompt),
        ("human", query)
    ]
    return llmModel.invoke(messages).content

def get_response_for_query(query, video_data, llmModel):
    retriever = QdrantVectorStore.from_existing_collection(
        collection_name=f"yt-{video_data['video_id']}",
        embedding=video_data['embedder'],
        url=os.getenv("QDRANT_URL"),
        api_key=os.getenv("QDRANT_API_KEY")
    )

    relevant_chunks = retriever.similarity_search(query=query, k=8)

    system_prompt = f"""
    You are a helpful AI Assistant who provides detailed information about YouTube videos.

    Video Summary:
    {video_data['summary']}

    Relevant Transcript Sections:
    {chr(10).join(f"[{chunk.metadata.get('timestamp', 'Unknown')}] {chunk.page_content}" for chunk in relevant_chunks)}

    General Instructions:
    - Answer the user's questions based on the transcript information
    - Reference timestamps when discussing specific parts of the video
    - If asked for a summary, provide the comprehensive video summary
    - Your knowledge is limited to what's in this video transcript
    """

    if "summary" in query.lower():
        return f"Here's a summary of the video:\n\n{video_data['summary']}"

    return process_query(query, llmModel, system_prompt)

# Shared LLM instance
llmModel = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash-001",
    temperature=0,
    max_tokens=None,
    timeout=None,
    max_retries=2
)

# FastAPI Routes
@app.post("/load_video")
def process_video(request: VideoURLRequest):
    print("Request Processed: ", request)
    try:
        video_data = setup_video_bot(request.youtube_url, llmModel)
        VIDEO_DATA_CACHE[video_data["video_id"]] = video_data
        return {
            "video_id": video_data["video_id"],
            "summary": video_data["summary"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ask_question")
def ask_question(request: QuestionRequest):
    if request.video_id not in VIDEO_DATA_CACHE:
        raise HTTPException(status_code=404, detail="Video not processed yet.")
    try:
        video_data = VIDEO_DATA_CACHE[request.video_id]
        answer = get_response_for_query(request.question, video_data, llmModel)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def root():
    return {"status": "ok"}