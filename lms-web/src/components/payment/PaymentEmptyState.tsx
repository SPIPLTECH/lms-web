export default function PaymentEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="text-3xl font-bold mb-4">
        No Payments Found
      </h2>

      <p className="text-gray-600">
        Payment records will appear here.
      </p>
    </div>
  );
}