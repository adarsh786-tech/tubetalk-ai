import { VideoData } from "@/lib/youtube/types";

declare global {
  var videoCache: Record<string, VideoData> | undefined;
}

export {};
