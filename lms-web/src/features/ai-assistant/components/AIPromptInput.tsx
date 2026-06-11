"use client";

export default function AIPromptInput() {
  return (
    <div className="flex gap-4">
      <input
        type="text"
        placeholder="Ask AI anything..."
        className="flex-1 border rounded-xl px-4 py-3"
      />

      <button className="bg-orange-500 text-white px-6 py-3 rounded-xl">
        Ask
      </button>
    </div>
  );
}
