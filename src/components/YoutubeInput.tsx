"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const YouTubeInput = () => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const validateYouTubeUrl = (url: string) => {
    // Basic YouTube URL validation
    const youtubeRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(\S*)?$/;
    return youtubeRegex.test(url);
  };

  const extractVideoId = (url: string) => {
    const match = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateYouTubeUrl(url)) {
      alert("Please enter a valid YouTube URL"); // todo: use toast instead. fix it
      return;
    }

    setIsLoading(true);

    const videoId = extractVideoId(url);
    if (videoId) {
      // Simulate loading for demo purposes
      setTimeout(() => {
        setIsLoading(false);
        router.push(`/chat/${videoId}`);
      }, 1500);
    } else {
      alert("Could not extract video ID from URL"); // todo: use toast instead. fix it
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="youtube-url" className="text-lg font-medium">
          Enter YouTube URL
        </label>
        <Input
          id="youtube-url"
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Loading..." : "Start Chatting"}
      </Button>
    </form>
  );
};

export default YouTubeInput;
