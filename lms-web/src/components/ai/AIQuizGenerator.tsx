"use client";

export default function AIQuizGenerator() {
  return (
    <div className="bg-white p-8 rounded-2xl shadow">
      <h2 className="text-3xl font-bold mb-6">
        AI Quiz Generator
      </h2>

      <textarea
        placeholder="Enter topic for quiz generation..."
        className="w-full border rounded-xl p-4 h-40"
      />

      <button className="mt-6 bg-orange-500 text-white px-6 py-3 rounded-xl">
        Generate Quiz
      </button>
    </div>
  );
}