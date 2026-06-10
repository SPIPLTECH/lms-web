import QuizCard from "./QuizCard";

export default function QuizList() {
  const quizzes = [
    {
      title: "React Basics",
      questions: 10,
      duration: "15 mins",
    },

    {
      title: "Node.js Fundamentals",
      questions: 15,
      duration: "20 mins",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {quizzes.map((quiz) => (
        <QuizCard
          key={quiz.title}
          title={quiz.title}
          questions={quiz.questions}
          duration={quiz.duration}
        />
      ))}
    </div>
  );
}