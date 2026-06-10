export default function QuizEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="text-3xl font-bold mb-4">
        No Quizzes Available
      </h2>

      <p className="text-gray-600">
        Quizzes will appear here soon.
      </p>
    </div>
  );
}