import dotenv from "dotenv";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

dotenv.config();

export const llmModel = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash-001",
  temperature: 0,
  maxRetries: 2,
});

export function extractVideoId(url: string): string | null {
  const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
  return match ? match[1] : null;
}
