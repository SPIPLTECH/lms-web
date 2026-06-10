type PaymentDetailsProps = {
  transactionId: string;
  paymentDate: string;
};

export default function PaymentDetails({
  transactionId,
  paymentDate,
}: PaymentDetailsProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-4">
        Payment Details
      </h2>

      <p className="mb-2">
        Transaction ID: {transactionId}
      </p>

      <p>
        Payment Date: {paymentDate}
      </p>
    </div>
  );
}