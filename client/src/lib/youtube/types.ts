/* eslint-disable @typescript-eslint/no-explicit-any @typescript-eslint/no-unused-vars*/
import { Document } from "@langchain/core/documents";

export interface VideoData {
  videoId: string;
  vectorStore: any;
  embedder: any;
  transcriptDocs: Document[];
  summary: string;
  fullTranscript: string;
}
