"use client";

import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Login
      </h1>

      <form className="space-y-4">
        <div>
          <label className="block mb-1">Email</label>
          <input
            type="email"
            placeholder="Enter email"
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>

        <div>
          <label className="block mb-1">Password</label>
          <input
            type="password"
            placeholder="Enter password"
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-orange-500 text-white py-2 rounded-lg"
        >
          Login
        </button>
      </form>

      <div className="flex justify-between mt-4 text-sm">
        <Link href="/forgot-password">
          Forgot Password?
        </Link>

        <Link href="/register">
          Register
        </Link>
      </div>
    </div>
  );
}