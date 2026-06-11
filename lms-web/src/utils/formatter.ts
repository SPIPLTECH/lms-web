export function formatCurrency(
  amount: number
) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

export function formatDate(
  date: Date
) {
  return new Date(date).toLocaleDateString();
}
