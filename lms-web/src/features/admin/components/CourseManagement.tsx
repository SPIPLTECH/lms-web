export default function CourseManagement() {
  const courses = [
    "React Course",
    "Backend Course",
  ];

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-4">
        Courses
      </h2>

      <ul className="space-y-3">
        {courses.map((course) => (
          <li key={course}>
            {course}
          </li>
        ))}
      </ul>
    </div>
  );
}
