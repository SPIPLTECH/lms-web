export default function QuizzesPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">
        Quizzes
      </h1>

      <div className="space-y-4">
        <div className="bg-white p-4 rounded-xl shadow">
          JavaScript Quiz
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          Database Quiz
        </div>
      </div>
    </div>
  );
}