import { Document } from "@langchain/core/documents";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";

export interface VideoData {
  videoId: string;
  vectorStore: QdrantVectorStore;
  embedder: GoogleGenerativeAIEmbeddings;
  transcriptDocs: Document[];
  summary: string;
  fullTranscript: string;
}

export interface TranscriptEntry {
  text: string;
  start: number;
  duration: number;
}