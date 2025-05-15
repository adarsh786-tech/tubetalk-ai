import { NextRequest, NextResponse } from "next/server";
import { getResponseForQuery } from "@/lib/youtube/queryProcessor";
import { llmModel } from "@/lib/youtube/utils";

export async function POST(req: NextRequest) {
  const { video_id, question } = await req.json();
  const videoCache = globalThis.videoCache || {};

  if (!videoCache[video_id]) {
    return NextResponse.json(
      { error: "Video not processed yet." },
      { status: 404 }
    );
  }

  try {
    const answer = await getResponseForQuery(
      question,
      videoCache[video_id],
      llmModel
    );
    return NextResponse.json({ answer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
