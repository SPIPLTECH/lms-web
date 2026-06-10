"use client";

import { useState } from "react";

import AIHeader from "./AIHeader";
import AIInputBox from "./AIInputBox";
import AIMessage from "./AIMessage";

export default function AITutorChat() {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      content: "Hello! How can I help you today?",
    },
  ]);

  const handleSend = (message: string) => {
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: message,
      },

      {
        role: "ai",
        content: "AI response for: " + message,
      },
    ]);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <AIHeader />

      <div className="h-[500px] overflow-y-auto p-6 space-y-4">
        {messages.map((message, index) => (
          <AIMessage
            key={index}
            role={message.role}
            content={message.content}
          />
        ))}
      </div>

      <AIInputBox onSend={handleSend} />
    </div>
  );
}