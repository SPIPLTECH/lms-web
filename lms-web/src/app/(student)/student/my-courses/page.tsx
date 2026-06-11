export default function MyCoursesPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">
        My Courses
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-xl shadow">
          React Mastery
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          Node.js Backend
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          AI Fundamentals
        </div>
      </div>
    </div>
  );
}