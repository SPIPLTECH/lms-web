type PaymentInvoiceProps = {
  invoiceId: string;
};

export default function PaymentInvoice({
  invoiceId,
}: PaymentInvoiceProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-4">
        Invoice
      </h2>

      <p>
        Invoice ID: {invoiceId}
      </p>

      <button className="mt-4 bg-orange-500 text-white px-5 py-2 rounded-lg">
        Download Invoice
      </button>
    </div>
  );
}