export default function AIConversation() {
  const messages = [
    "Hello, how can I help you?",
    "Explain React Hooks",
  ];

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message}
          className="bg-gray-100 rounded-xl p-4"
        >
          {message}
        </div>
      ))}
    </div>
  );
}
