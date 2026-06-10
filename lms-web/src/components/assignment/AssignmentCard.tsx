type AssignmentCardProps = {
  title: string;
  course: string;
  dueDate: string;
};

export default function AssignmentCard({
  title,
  course,
  dueDate,
}: AssignmentCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-2">
        {title}
      </h2>

      <p className="text-gray-600 mb-2">
        Course: {course}
      </p>

      <p className="text-red-500 text-sm">
        Due Date: {dueDate}
      </p>
    </div>
  );
}