"use client";

import { useState } from "react";
import { forgotPassword } from "@/services/auth.service";

export default function ForgotPassword() {
  const [email, setEmail] =
    useState("");

  const [message, setMessage] =
    useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response =
        await forgotPassword(email);

      setMessage(
        response.message ||
          "Reset email sent."
      );
    } catch (error) {
      setMessage(
        error.response?.data
          ?.message ||
          "Something went wrong."
      );
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-slate-950">
      <div className="bg-slate-900 p-8 rounded-xl w-full max-w-md">
        <h1 className="text-3xl text-white font-bold mb-6">
          Forgot Password
        </h1>

        {message && (
          <div className="mb-4 p-3 bg-orange-600 text-white rounded">
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 rounded bg-slate-800 text-white"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
          />

          <button
            className="w-full bg-orange-600 py-3 rounded text-white"
          >
            Send Reset Link
          </button>
        </form>
      </div>
    </div>
  );
}