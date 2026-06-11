type AIMessageProps = {
  message: string;
};

export default function AIMessage({
  message,
}: AIMessageProps) {
  return (
    <div className="bg-gray-100 rounded-xl p-4">
      {message}
    </div>
  );
}
