import AssignmentCard from "./AssignmentCard";

export default function AssignmentList() {
  const assignments = [
    {
      title: "React Project",
      course: "React Masterclass",
      dueDate: "15 June 2026",
    },

    {
      title: "Backend API Task",
      course: "Node.js Backend",
      dueDate: "20 June 2026",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {assignments.map((assignment) => (
        <AssignmentCard
          key={assignment.title}
          title={assignment.title}
          course={assignment.course}
          dueDate={assignment.dueDate}
        />
      ))}
    </div>
  );
}