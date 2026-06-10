type AIMessageProps = {
  role: string;
  content: string;
};

export default function AIMessage({
  role,
  content,
}: AIMessageProps) {
  return (
    <div
      className={`p-4 rounded-xl max-w-[80%] ${
        role === "user"
          ? "bg-orange-500 text-white ml-auto"
          : "bg-gray-100 text-black"
      }`}
    >
      {content}
    </div>
  );
}