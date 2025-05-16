import ChatPage from "@/components/ChatPage";

const ChatBot = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return <ChatPage videoId={id} />;
};

export default ChatBot;
