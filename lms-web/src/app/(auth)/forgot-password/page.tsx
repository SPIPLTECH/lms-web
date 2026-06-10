"use client";

import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Forgot Password
      </h1>

      <form className="space-y-4">
        <div>
          <label className="block mb-1">Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-orange-500 text-white py-2 rounded-lg"
        >
          Send Reset Link
        </button>
      </form>

      <div className="mt-4 text-center text-sm">
        <Link href="/login">
          Back to Login
        </Link>
      </div>
    </div>
  );
}