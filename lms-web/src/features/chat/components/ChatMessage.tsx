type ChatMessageProps = {
  message: string;
};

export default function ChatMessage({
  message,
}: ChatMessageProps) {
  return (
    <div className="bg-gray-100 rounded-xl p-4">
      {message}
    </div>
  );
}
