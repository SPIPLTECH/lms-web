type QuizTimerProps = {
  time: string;
};

export default function QuizTimer({
  time,
}: QuizTimerProps) {
  return (
    <div className="bg-red-100 text-red-600 px-4 py-2 rounded-xl inline-block">
      Time Left: {time}
    </div>
  );
}