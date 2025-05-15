import { NextRequest, NextResponse } from "next/server";
import { setupVideoBot } from "@/lib/youtube/videoBot";
import { llmModel } from "@/lib/youtube/utils";

export async function POST(req: NextRequest) {
  try {
    const { youtube_url } = await req.json();
    const videoData = await setupVideoBot(youtube_url, llmModel);
    globalThis.videoCache ||= {};
    globalThis.videoCache[videoData.videoId] = videoData;

    return NextResponse.json({
      video_id: videoData.videoId,
      summary: videoData.summary,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
