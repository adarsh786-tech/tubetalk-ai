"use client";
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import YouTubeEmbed from "@/components/YoutubeEmbed";
import ChatContainer from "@/components/ChatContainer";

type ChatPageProps = {
  videoId: string;
};

const ChatPage = ({ videoId }: ChatPageProps) => {
  if (!videoId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Video ID Missing</h1>
          <Button asChild>
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button variant="outline" asChild>
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft size={16} /> Back to Home
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col space-y-4">
            <h1 className="text-2xl font-bold">Video Chat</h1>
            <YouTubeEmbed videoId={videoId} />
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h2 className="font-medium text-gray-700 mb-2">
                About TubeTalk AI
              </h2>
              <p className="text-gray-600 text-sm">
                Ask questions about the YouTube video content, request
                summaries, or inquire about specific topics mentioned in the
                video.
              </p>
            </div>
          </div>

          <div className="h-[600px] lg:h-auto">
            <ChatContainer videoId={videoId} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
