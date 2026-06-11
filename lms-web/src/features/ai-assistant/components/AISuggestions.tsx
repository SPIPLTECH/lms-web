export default function AISuggestions() {
  const suggestions = [
    "Explain React",
    "Generate Quiz",
    "Summarize Notes",
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {suggestions.map((item) => (
        <button
          key={item}
          className="bg-orange-100 text-orange-600 px-4 py-2 rounded-full"
        >
          {item}
        </button>
      ))}
    </div>
  );
}
