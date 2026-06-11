export default function TeacherAssignments() {
  const assignments = [
    "Frontend Assignment",
    "Backend Assignment",
  ];

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <ul className="space-y-3">
        {assignments.map((assignment) => (
          <li key={assignment}>
            {assignment}
          </li>
        ))}
      </ul>
    </div>
  );
}
