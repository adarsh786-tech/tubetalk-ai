import ChatPage from "@/components/ChatPage";

const ChatBot = async ({ params }: { params: { id: any } }) => {
  const id = (await params).id;
  return <ChatPage videoId={id} />;
};

export default ChatBot;
