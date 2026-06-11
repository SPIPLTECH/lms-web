"use client";

export default function VerifyEmailForm() {
  return (
    <form className="space-y-5">
      <input
        type="text"
        placeholder="Verification Code"
        className="w-full border rounded-xl p-4"
      />

      <button className="bg-orange-500 text-white px-6 py-3 rounded-xl">
        Verify Email
      </button>
    </form>
  );
}