/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { setupVideoBot } from "@/lib/youtube/videoBot";
import { llmModel } from "@/lib/youtube/utils";
import { redis } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const { videoUrl } = await req.json();
    const { videoId, summary, fullTranscript } = await setupVideoBot(
      videoUrl,
      llmModel
    );

    // Save summary and status to Redis
    await redis.set(`video:${videoId}:status`, "ready");
    await redis.set(`video:${videoId}:summary`, summary);
    await redis.set(`video:${videoId}:transcript`, fullTranscript); // optional

    return NextResponse.json({
      message: "Video processed successfully",
      videoId,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
