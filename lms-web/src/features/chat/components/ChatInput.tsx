"use client";

export default function ChatInput() {
  return (
    <div className="flex gap-4 mt-4">
      <input
        type="text"
        placeholder="Type message..."
        className="flex-1 border rounded-xl px-4 py-3"
      />

      <button className="bg-orange-500 text-white px-6 py-3 rounded-xl">
        Send
      </button>
    </div>
  );
}
