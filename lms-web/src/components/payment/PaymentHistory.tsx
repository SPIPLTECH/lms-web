export default function PaymentHistory() {
  const history = [
    {
      course: "React Masterclass",
      amount: "₹999",
    },

    {
      course: "Database Course",
      amount: "₹799",
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-6">
        Payment History
      </h2>

      <div className="space-y-4">
        {history.map((item) => (
          <div
            key={item.course}
            className="border-b pb-3"
          >
            {item.course} - {item.amount}
          </div>
        ))}
      </div>
    </div>
  );
}