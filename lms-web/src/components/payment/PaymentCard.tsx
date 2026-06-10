type PaymentCardProps = {
  course: string;
  amount: string;
  status: string;
};

export default function PaymentCard({
  course,
  amount,
  status,
}: PaymentCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-2">
        {course}
      </h2>

      <p className="text-gray-600 mb-2">
        Amount: {amount}
      </p>

      <p className="text-orange-500 font-semibold">
        Status: {status}
      </p>
    </div>
  );
}