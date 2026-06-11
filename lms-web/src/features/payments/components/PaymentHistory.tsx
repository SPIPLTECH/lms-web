export default function PaymentHistory() {
  const history = [
    "Payment for React Course",
    "Payment for Backend Course",
  ];

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="space-y-3">
        {history.map((item) => (
          <div key={item}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
