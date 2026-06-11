export default function StudentAssignments() {
  const assignments = [
    "React Assignment",
    "API Assignment",
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
