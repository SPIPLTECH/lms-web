"use client";

export default function LoginForm() {
  return (
    <form className="space-y-5">
      <input
        type="email"
        placeholder="Email"
        className="w-full border rounded-xl p-4"
      />

      <input
        type="password"
        placeholder="Password"
        className="w-full border rounded-xl p-4"
      />

      <button className="bg-orange-500 text-white px-6 py-3 rounded-xl">
        Login
      </button>
    </form>
  );
}