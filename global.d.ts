declare module "youtube-transcript-api" {
  export interface TranscriptResponse {
    text: string;
    duration: number;
    offset: number;
  }

  export function getTranscript(videoId: string): Promise<TranscriptResponse[]>;
}
