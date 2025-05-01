import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle } from "lucide-react";
import ChatMessage, { MessageType } from "@/components/ChatMessage";
import { v4 as uuidv4 } from "uuid";

interface ChatContainerProps {
  videoId: string;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ videoId }) => {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!videoId) return;

    const loadVideo = async () => {
      setIsTyping(true);
      try {
        const res = await fetch(`${process.env.BACKEND_URL}/load_video`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
          }),
        });

        if (!res.ok) throw new Error("Failed to load video");

        const _ = await res.json();
        setMessages([
          {
            id: uuidv4(),
            content: "Hi! I’ve loaded the video. What would you like to ask?",
            isUser: false,
          },
        ]);
        setIsVideoReady(true);
      } catch (err) {
        setMessages([
          {
            id: uuidv4(),
            content: `Failed to load video transcript. Please try again. ${err}`,
            isUser: false,
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    };

    loadVideo();
  }, [videoId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isVideoReady) return;

    const userMessage: MessageType = {
      id: uuidv4(),
      content: newMessage,
      isUser: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    setNewMessage("");
    setIsTyping(true);

    try {
      const res = await fetch(`${process.env.BACKEND_URL}ask_question`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          video_id: videoId,
          question: newMessage,
        }),
      });

      const data = await res.json();

      const assistantMessage: MessageType = {
        id: uuidv4(),
        content: data.answer,
        isUser: false,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          content: `Sorry, there was an error fetching a response. ${error}`,
          isUser: false,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden shadow-md">
      <div className="p-3 bg-primary text-white flex items-center gap-2 shadow-sm">
        <MessageCircle size={20} />
        <h2 className="font-medium">TubeTalk AI Assistant</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 chat-message-container">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isTyping && (
          <div className="message-typing self-start">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-3 border-t flex gap-2">
        <Input
          type="text"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1"
          disabled={!isVideoReady}
        />
        <Button type="submit" size="icon" disabled={!isVideoReady}>
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
};

export default ChatContainer;
