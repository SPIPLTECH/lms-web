type PaymentInvoiceProps = {
  invoiceId: string;
};

export default function PaymentInvoice({
  invoiceId,
}: PaymentInvoiceProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      Invoice ID: {invoiceId}
    </div>
  );
}
