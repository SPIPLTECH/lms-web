export default function ChatList() {
  const chats = [
    "Frontend Team",
    "Backend Team",
    "AI Discussion",
  ];

  return (
    <div className="space-y-3">
      {chats.map((chat) => (
        <div
          key={chat}
          className="p-3 bg-gray-100 rounded-xl"
        >
          {chat}
        </div>
      ))}
    </div>
  );
}
