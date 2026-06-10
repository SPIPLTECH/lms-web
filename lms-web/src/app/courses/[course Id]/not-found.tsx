export default function CourseNotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">
        Course Not Found
      </h1>

      <p className="text-gray-600">
        The requested course does not exist.
      </p>
    </div>
  );
}