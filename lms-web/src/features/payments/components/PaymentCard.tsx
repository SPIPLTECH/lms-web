type PaymentCardProps = {
  course: string;
  amount: string;
};

export default function PaymentCard({
  course,
  amount,
}: PaymentCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-xl font-bold mb-2">
        {course}
      </h2>

      <p className="text-orange-500">
        {amount}
      </p>
    </div>
  );
}
