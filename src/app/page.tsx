import React from "react";
import YouTubeInput from "@/components/YoutubeInput";

const Home = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <div className="max-w-4xl w-full mx-auto flex flex-col items-center text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            TubeTalk AI
          </h1>
          <p className="text-lg md:text-xl text-gray-700 max-w-2xl mx-auto">
            Chat with AI about any YouTube video. Just paste a YouTube URL and
            start asking questions.
          </p>
        </div>

        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <YouTubeInput />
        </div>

        <div className="text-sm text-gray-500">
          <p>Example: https://www.youtube.com/watch?v=dQw4w9WgXcQ</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
