type AssignmentDeadlineProps = {
  dueDate: string;
};

export default function AssignmentDeadline({
  dueDate,
}: AssignmentDeadlineProps) {
  return (
    <div className="bg-red-100 text-red-600 p-4 rounded-xl">
      Deadline: {dueDate}
    </div>
  );
}