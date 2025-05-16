/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getResponseForQuery } from "@/lib/youtube/queryProcessor";
import { llmModel } from "@/lib/youtube/utils";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

export async function POST(req: NextRequest) {
  const { video_id, question } = await req.json();

  // 1. Check Redis for video processing status
  const status = await redis.get(`video:${video_id}:status`);
  if (status !== "ready") {
    return NextResponse.json(
      { error: "Video not processed yet." },
      { status: 404 }
    );
  }

  // 2. Load summary and embedder from Redis
  const summary = await redis.get(`video:${video_id}:summary`);
  if (!summary) {
    return NextResponse.json(
      { error: "Video summary not found in cache." },
      { status: 500 }
    );
  }

  const embedder = new GoogleGenerativeAIEmbeddings({
    model: "models/text-embedding-004",
  });

  const videoData = {
    videoId: video_id,
    summary,
    embedder,
  };

  try {
    const answer = await getResponseForQuery(question, videoData, llmModel);
    return NextResponse.json({ answer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
