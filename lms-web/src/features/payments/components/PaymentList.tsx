import PaymentCard from "./PaymentCard";

export default function PaymentList() {
  const payments = [
    {
      course: "React Course",
      amount: "₹999",
    },

    {
      course: "Node.js Course",
      amount: "₹1499",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {payments.map((payment) => (
        <PaymentCard
          key={payment.course}
          course={payment.course}
          amount={payment.amount}
        />
      ))}
    </div>
  );
}
