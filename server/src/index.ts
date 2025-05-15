// Required Libraries
import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { YoutubeTranscript } from "youtube-transcript";
import {
  GoogleGenerativeAIEmbeddings,
  ChatGoogleGenerativeAI,
} from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "@langchain/core/documents";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8000;
// { origin: "http://localhost:3000", credentials: true }
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

interface VideoData {
  videoId: string;
  vectorStore: any;
  embedder: any;
  transcriptDocs: Document[];
  summary: string;
  fullTranscript: string;
}

const VIDEO_DATA_CACHE: Record<string, VideoData> = {};

// Extract video ID
function extractVideoId(url: string): string | null {
  const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
  return match ? match[1] : null;
}

async function createVideoSummary(
  allChunks: Document[],
  llmModel: any,
  videoId: string
): Promise<string> {
  const totalChunks = allChunks.length;

  // Add a check for empty chunks
  if (!allChunks || allChunks.length === 0) {
    return "No transcript content available to summarize.";
  }

  let sampledChunks: Document[] = [];
  if (totalChunks > 50) {
    sampledChunks = [
      ...allChunks.slice(0, 10),
      ...allChunks.slice(
        Math.floor(totalChunks / 2) - 5,
        Math.floor(totalChunks / 2) + 5
      ),
      ...allChunks.slice(-10),
    ];
  } else {
    sampledChunks = allChunks;
  }

  const combinedContent = sampledChunks
    .map((chunk) => `[${chunk.metadata.timestamp}] ${chunk.pageContent}`)
    .join("\n");

  // Add validation to ensure combined content is not empty
  if (!combinedContent.trim()) {
    return "No transcript content available to summarize.";
  }

  const messages = [
    {
      role: "system",
      content:
        "Create a comprehensive summary of this YouTube video transcript. Focus on the main topics, key points, and overall structure of the video.",
    },
    { role: "user", content: combinedContent },
  ];

  try {
    const res = await llmModel.invoke(messages);
    return res.content || "Unable to generate summary.";
  } catch (error: any) {
    console.error("Error generating summary:", error);
    return "An error occurred while generating the summary.";
  }
}

async function uploadInChunks(
  docs: Document[],
  embedder: any,
  batchSize: number,
  options: any
) {
  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);

    // ✅ Ensure embeddings are valid
    const embeddings = await embedder.embedDocuments(
      chunk.map((doc) => doc.pageContent)
    );

    const validEmbeddings = embeddings.filter(
      (vec: number[]) => Array.isArray(vec) && vec.length === 768
    );

    if (validEmbeddings.length !== chunk.length) {
      console.warn(
        `Skipped ${
          chunk.length - validEmbeddings.length
        } documents with invalid embeddings.`
      );
    }

    const validDocs = chunk.filter((_, index) => {
      return (
        Array.isArray(embeddings[index]) && embeddings[index].length === 768
      );
    });

    if (validDocs.length > 0) {
      await QdrantVectorStore.fromDocuments(validDocs, embedder, options);
    }
  }
}

async function setupVideoBot(
  videoUrl: string,
  llmModel: any
): Promise<VideoData> {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) throw new Error("Invalid YouTube URL");

  // Fetch transcript and add validation
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  if (!transcript || transcript.length === 0) {
    throw new Error(
      "Could not retrieve transcript for this video or transcript is empty"
    );
  }

  const transcriptDocs: Document[] = transcript.map((entry: any) => {
    const start = entry.start;
    const mins = Math.floor(start / 60);
    const hrs = Math.floor(mins / 60);
    const timestamp = `${String(hrs).padStart(2, "0")}:${String(
      mins % 60
    ).padStart(2, "0")}:${(start % 60).toFixed(2)}`;

    // Ensure text content is never empty
    const text = entry.text && entry.text.trim() ? entry.text : "[Inaudible]";

    return new Document({
      pageContent: text,
      metadata: { timestamp, video_id: videoId },
    });
  });

  const filteredDocs = transcriptDocs.filter(
    (doc) => doc.pageContent && doc.pageContent.trim().length > 0
  );

  const embedder = new GoogleGenerativeAIEmbeddings({
    model: "models/text-embedding-004",
  });

  await uploadInChunks(filteredDocs, embedder, 100, {
    collectionName: `yt-${videoId}`,
    url: process.env.QDRANT_URL!,
    apiKey: process.env.QDRANT_API_KEY!,
  });

  const vectorStore = await QdrantVectorStore.fromExistingCollection(embedder, {
    collectionName: `yt-${videoId}`,
    url: process.env.QDRANT_URL!,
    apiKey: process.env.QDRANT_API_KEY!,
  });

  const summary = await createVideoSummary(filteredDocs, llmModel, videoId);
  const fullTranscript = filteredDocs
    .map((doc) => `[${doc.metadata.timestamp}] ${doc.pageContent}`)
    .join("\n");

  return {
    videoId,
    vectorStore,
    embedder,
    transcriptDocs,
    summary,
    fullTranscript,
  };
}

async function processQuery(
  query: string,
  llmModel: any,
  systemPrompt: string
): Promise<string> {
  // Add validation for empty inputs
  if (!systemPrompt.trim()) {
    systemPrompt =
      "You are a helpful assistant answering questions about a YouTube video.";
  }

  if (!query.trim()) {
    return "Please provide a valid question about the video.";
  }

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: query },
  ];

  try {
    const res = await llmModel.invoke(messages);
    return res.content || "No response generated.";
  } catch (error: any) {
    console.error("Error processing query:", error);
    return `An error occurred while processing your query: ${error.message}`;
  }
}

async function getResponseForQuery(
  query: string,
  videoData: VideoData,
  llmModel: any
): Promise<string> {
  // Add validation check
  if (!query.trim()) {
    return "Please provide a valid question about the video.";
  }

  const retriever = await QdrantVectorStore.fromExistingCollection(
    videoData.embedder,
    {
      collectionName: `yt-${videoData.videoId}`,
      url: process.env.QDRANT_URL!,
      apiKey: process.env.QDRANT_API_KEY!,
      // checkCompatibility: false, // Added to fix Qdrant connection issues
    }
  );

  const relevantChunks = await retriever.similaritySearch(query, 8);

  // Handle case where no relevant chunks are found
  const chunksContent =
    relevantChunks.length > 0
      ? relevantChunks
          .map(
            (chunk) =>
              `[${chunk.metadata.timestamp || "Unknown"}] ${chunk.pageContent}`
          )
          .join("\n")
      : "No specific transcript sections found relevant to your query.";

  const systemPrompt = `You are a helpful AI Assistant who provides detailed information about YouTube videos.

Video Summary:
${videoData.summary || "No summary available."}

Relevant Transcript Sections:
${chunksContent}

General Instructions:
- Answer the user's questions based on the transcript information
- Reference timestamps when discussing specific parts of the video
- If asked for a summary, provide the comprehensive video summary
- Your knowledge is limited to what's in this video transcript`;

  if (query.toLowerCase().includes("summary")) {
    return `Here's a summary of the video:\n\n${
      videoData.summary || "No summary available."
    }`;
  }

  return await processQuery(query, llmModel, systemPrompt);
}

const llmModel = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash-001",
  temperature: 0,
  maxRetries: 2,
});

// Routes

app.get("/", (_: Request, res: Response) => {
  res.status(200).json({ status: "all ok" });
});

app.post("/load_video", async (req: Request, res: Response) => {
  try {
    const { youtube_url } = req.body;
    const videoData = await setupVideoBot(youtube_url, llmModel);
    VIDEO_DATA_CACHE[videoData.videoId] = videoData;
    res.json({ video_id: videoData.videoId, summary: videoData.summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/ask_question", async (req: Request, res: Response) => {
  const { video_id, question } = req.body;
  if (!VIDEO_DATA_CACHE[video_id]) {
    res.status(404).json({ error: "Video not processed yet." });
    return;
  }
  try {
    const answer = await getResponseForQuery(
      question,
      VIDEO_DATA_CACHE[video_id],
      llmModel
    );
    res.json({ answer });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
