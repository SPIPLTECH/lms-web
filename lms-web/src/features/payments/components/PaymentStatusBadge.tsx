type PaymentStatusBadgeProps = {
  status: "Paid" | "Pending";
};

export default function PaymentStatusBadge({
  status,
}: PaymentStatusBadgeProps) {
  return (
    <div className="bg-green-500 text-white px-4 py-2 rounded-full inline-block">
      {status}
    </div>
  );
}
