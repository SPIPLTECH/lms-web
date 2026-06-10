type QuizCardProps = {
  title: string;
  questions: number;
  duration: string;
};

export default function QuizCard({
  title,
  questions,
  duration,
}: QuizCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-3">
        {title}
      </h2>

      <p className="text-gray-600 mb-2">
        Questions: {questions}
      </p>

      <p className="text-orange-500 font-semibold">
        Duration: {duration}
      </p>
    </div>
  );
}