"use client";

import { useState } from "react";

export default function AITutorPage() {
  const [question, setQuestion] = useState("");

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">
        AI Tutor
      </h1>

      <div className="bg-white p-6 rounded-xl shadow">
        <textarea
          placeholder="Ask your question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full border rounded-lg p-4 h-40"
        />

        <button className="mt-4 bg-orange-500 text-white px-6 py-2 rounded-lg">
          Ask AI
        </button>
      </div>
    </div>
  );
}