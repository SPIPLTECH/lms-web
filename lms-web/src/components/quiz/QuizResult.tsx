type QuizResultProps = {
  score: number;
  total: number;
};

export default function QuizResult({
  score,
  total,
}: QuizResultProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-8 text-center">
      <h2 className="text-4xl font-bold mb-4">
        Quiz Result
      </h2>

      <p className="text-2xl text-orange-500">
        {score} / {total}
      </p>
    </div>
  );
}