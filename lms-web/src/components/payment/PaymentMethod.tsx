export default function PaymentMethod() {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-6">
        Payment Methods
      </h2>

      <div className="space-y-4">
        <div>Credit Card</div>

        <div>UPI</div>

        <div>Net Banking</div>
      </div>
    </div>
  );
}