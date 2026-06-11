"use client";

export default function PaymentForm() {
  return (
    <form className="space-y-5 bg-white rounded-2xl shadow p-6">
      <input
        type="text"
        placeholder="Card Number"
        className="w-full border rounded-xl p-4"
      />

      <input
        type="text"
        placeholder="Card Holder Name"
        className="w-full border rounded-xl p-4"
      />

      <button className="bg-orange-500 text-white px-6 py-3 rounded-xl">
        Pay Now
      </button>
    </form>
  );
}
