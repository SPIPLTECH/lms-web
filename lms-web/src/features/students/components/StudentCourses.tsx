export default function StudentCourses() {
  const courses = [
    "React Course",
    "Backend Course",
  ];

  return (
    <div className="bg-white rounded-2xl shadow p-6">
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
