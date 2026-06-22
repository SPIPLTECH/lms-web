"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resetPassword } from "@/services/auth.service";

export default function ResetPassword() {
  const router = useRouter();

  const [formData, setFormData] =
    useState({
      token: "",
      password: "",
      confirmPassword: "",
    });

  const [message, setMessage] =
    useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]:
        e.target.value,
    });
  };

  const handleSubmit =
    async (e) => {
      e.preventDefault();

      if (
        formData.password !==
        formData.confirmPassword
      ) {
        setMessage(
          "Passwords do not match"
        );
        return;
      }

      try {
        await resetPassword(
          formData.token,
          formData.password
        );

        setMessage(
          "Password reset successful"
        );

        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } catch (error) {
        setMessage(
          error.response?.data
            ?.message ||
            "Reset failed"
        );
      }
    };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md bg-slate-900 p-8 rounded-xl">
        <h1 className="text-4xl font-bold text-white mb-6">
          Reset Password
        </h1>

        {message && (
          <div className="mb-4 p-3 bg-orange-600 rounded text-white">
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <input
            type="text"
            name="token"
            placeholder="Reset Token"
            value={formData.token}
            onChange={handleChange}
            className="w-full p-3 rounded bg-slate-800 text-white"
          />

          <input
            type="password"
            name="password"
            placeholder="New Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full p-3 rounded bg-slate-800 text-white"
          />

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={
              formData.confirmPassword
            }
            onChange={handleChange}
            className="w-full p-3 rounded bg-slate-800 text-white"
          />

          <button
            className="w-full bg-orange-600 py-3 rounded text-white"
          >
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}