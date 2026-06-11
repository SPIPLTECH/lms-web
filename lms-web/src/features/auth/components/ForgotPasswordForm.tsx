"use client";

export default function ForgotPasswordForm() {
  return (
    <form className="space-y-5">
      <input
        type="email"
        placeholder="Enter your email"
        className="w-full border rounded-xl p-4"
      />

      <button className="bg-orange-500 text-white px-6 py-3 rounded-xl">
        Send Reset Link
      </button>
    </form>
  );
}