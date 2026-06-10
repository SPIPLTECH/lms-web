type CourseProgressProps = {
  progress: number;
};

export default function CourseProgress({
  progress,
}: CourseProgressProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex justify-between mb-3">
        <span className="font-semibold">
          Progress
        </span>

        <span>{progress}%</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-4">
        <div
          className="bg-orange-500 h-4 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}