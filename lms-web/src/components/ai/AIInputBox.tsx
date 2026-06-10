"use client";

import { useState } from "react";

type AIInputBoxProps = {
  onSend: (message: string) => void;
};

export default function AIInputBox({
  onSend,
}: AIInputBoxProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    if (!message.trim()) return;

    onSend(message);

    setMessage("");
  };

  return (
    <div className="border-t p-4 flex gap-4">
      <input
        type="text"
        placeholder="Ask AI anything..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="flex-1 border rounded-xl px-4 py-3"
      />

      <button
        onClick={handleSubmit}
        className="bg-orange-500 text-white px-6 py-3 rounded-xl"
      >
        Send
      </button>
    </div>
  );
}