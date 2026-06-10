type QuizOptionsProps = {
  options: string[];
};

export default function QuizOptions({
  options,
}: QuizOptionsProps) {
  return (
    <div className="space-y-4">
      {options.map((option) => (
        <button
          key={option}
          className="w-full text-left border rounded-xl p-4 hover:bg-gray-100"
        >
          {option}
        </button>
      ))}
    </div>
  );
}