import { YoutubeTranscript } from "youtube-transcript";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "@langchain/core/documents";
import { extractVideoId, llmModel } from "@/lib/youtube/utils";
import {
  createVideoSummary,
  uploadInChunks,
} from "@/lib/youtube/queryProcessor";

export async function setupVideoBot(
  videoUrl: string,
  llmModelInstance: typeof llmModel
) {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) throw new Error("Invalid YouTube URL");

  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  if (!transcript || transcript.length === 0) {
    throw new Error("Could not retrieve transcript.");
  }
  // @typescript-eslint/no-explicit-any
  const transcriptDocs: Document[] = transcript.map((entry: any) => {
    // Ensure entry has the required TranscriptEntry properties
    const start = entry.start ?? 0;
    const mins = Math.floor(start / 60);
    const hrs = Math.floor(mins / 60);
    const timestamp = `${String(hrs).padStart(2, "0")}:${String(
      mins % 60
    ).padStart(2, "0")}:${(start % 60).toFixed(2)}`;

    const text = entry.text && entry.text.trim() ? entry.text : "[Inaudible]";

    return new Document({
      pageContent: text,
      metadata: { timestamp, video_id: videoId },
    });
  });

  const filteredDocs = transcriptDocs.filter(
    (doc) => doc.pageContent.trim().length > 0
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

  const summary = await createVideoSummary(
    filteredDocs,
    llmModelInstance,
    videoId
  );
  const fullTranscript = filteredDocs
    .map((doc) => `[${doc.metadata.timestamp}] ${doc.pageContent}`)
    .join("\n");

  return {
    videoId,
    vectorStore,
    embedder,
    transcriptDocs: filteredDocs,
    summary,
    fullTranscript,
  };
}
