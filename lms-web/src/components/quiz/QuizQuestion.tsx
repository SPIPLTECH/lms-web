type QuizQuestionProps = {
  question: string;
};

export default function QuizQuestion({
  question,
}: QuizQuestionProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-semibold">
        {question}
      </h2>
    </div>
  );
}