/** Same discount-over-list-price precedence as the course detail page's own enroll logic. */
export function getPriceInfo(store) {
  // A course is priced only when a Store row exists that is either explicitly
  // free or carries a real amount. A missing Store row is *not* a free course
  // — it is a course nobody has priced yet, and checkout for it would fail.
  // Same test the course detail page applies before it offers a Buy button.
  //
  // Additive: `isFree` keeps its previous value for every existing caller, so
  // a consumer that does not read `isPriced` behaves exactly as before.
  const isPriced = Boolean(store) && (store.isFree || Number(store.price) > 0);

  const isFree = !store || store.isFree || (!store.price && !store.discountPrice);
  if (isFree) return { isPriced, isFree: true, effectivePrice: 0, listPrice: null, currency: "INR" };

  const hasDiscount = store.discountPrice !== null && store.discountPrice !== undefined && store.discountPrice > 0 && store.discountPrice < store.price;

  return {
    isPriced,
    isFree: false,
    effectivePrice: hasDiscount ? store.discountPrice : store.price,
    listPrice: hasDiscount ? store.price : null,
    currency: store.currency || "INR",
  };
}

export function formatPrice(amount, currency) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}
