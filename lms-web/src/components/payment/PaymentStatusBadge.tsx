type PaymentStatusBadgeProps = {
  status: "Paid" | "Pending" | "Failed";
};

export default function PaymentStatusBadge({
  status,
}: PaymentStatusBadgeProps) {
  const color =
    status === "Paid"
      ? "bg-green-500"
      : status === "Pending"
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <span
      className={`${color} text-white px-4 py-1 rounded-full text-sm`}
    >
      {status}
    </span>
  );
}