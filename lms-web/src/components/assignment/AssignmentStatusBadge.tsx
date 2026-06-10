type AssignmentStatusBadgeProps = {
  status: "Pending" | "Submitted" | "Late";
};

export default function AssignmentStatusBadge({
  status,
}: AssignmentStatusBadgeProps) {
  const color =
    status === "Submitted"
      ? "bg-green-500"
      : status === "Late"
      ? "bg-red-500"
      : "bg-yellow-500";

  return (
    <span
      className={`${color} text-white px-4 py-1 rounded-full text-sm`}
    >
      {status}
    </span>
  );
}