import ChatPage from "@/components/ChatPage";

/* eslint-disable @typescript-eslint/no-explicit-any */
const ChatBot = async ({ params }: { params: { id: any } }) => {
  const id = params.id;
  return <ChatPage videoId={id} />;
};

export default ChatBot;
