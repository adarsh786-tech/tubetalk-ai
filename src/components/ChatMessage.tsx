import React from "react";

export type MessageType = {
  id: string;
  content: string;
  isUser: boolean;
};

interface ChatMessageProps {
  message: MessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  return (
    <div
      className={`chat-message ${
        message.isUser ? "user-message" : "ai-message"
      }`}
    >
      {message.content}
    </div>
  );
};

export default ChatMessage;
