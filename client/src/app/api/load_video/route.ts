/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { setupVideoBot } from "@/lib/youtube/videoBot";
import { llmModel } from "@/lib/youtube/utils";
import { redis } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const { youtube_url } = await req.json();

    console.log("URL: ", youtube_url);

    if (!youtube_url || typeof youtube_url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid videoUrl" },
        { status: 400 }
      );
    }

    const { videoId, summary, fullTranscript } = await setupVideoBot(
      youtube_url,
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
