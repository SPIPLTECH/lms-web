"use client";

import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md text-center">
      <h1 className="text-3xl font-bold mb-4">
        Verify Email
      </h1>

      <p className="text-gray-600 mb-6">
        We have sent a verification link to your email.
      </p>

      <button className="w-full bg-orange-500 text-white py-2 rounded-lg">
        Resend Email
      </button>

      <div className="mt-4 text-sm">
        <Link href="/login">
          Back to Login
        </Link>
      </div>
    </div>
  );
}