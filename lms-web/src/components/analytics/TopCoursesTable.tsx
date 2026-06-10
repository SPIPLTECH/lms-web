export default function TopCoursesTable() {
  const courses = [
    {
      name: "React Masterclass",
      students: 120,
    },

    {
      name: "Node.js Backend",
      students: 95,
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow p-6 overflow-x-auto">
      <h2 className="text-2xl font-bold mb-6">
        Top Courses
      </h2>

      <table className="w-full">
        <thead>
          <tr className="border-b text-left">
            <th className="py-3">Course</th>
            <th>Students</th>
          </tr>
        </thead>

        <tbody>
          {courses.map((course) => (
            <tr
              key={course.name}
              className="border-b"
            >
              <td className="py-3">
                {course.name}
              </td>

              <td>
                {course.students}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}