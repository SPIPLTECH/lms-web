import PaymentCard from "./PaymentCard";

export default function PaymentList() {
  const payments = [
    {
      course: "React Masterclass",
      amount: "₹999",
      status: "Paid",
    },

    {
      course: "Node.js Backend",
      amount: "₹1499",
      status: "Pending",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {payments.map((payment) => (
        <PaymentCard
          key={payment.course}
          course={payment.course}
          amount={payment.amount}
          status={payment.status}
        />
      ))}
    </div>
  );
}