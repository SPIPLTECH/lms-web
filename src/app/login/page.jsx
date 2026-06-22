"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import useAuth from "@/hooks/useAuth";

import AuthLayout from "@/components/auth/AuthLayout";
import AuthInput from "@/components/auth/AuthInput";

export default function LoginPage() {
  const router = useRouter();

  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const user = await login(formData);

      if (user.role === "ADMIN") {
        router.push("/admin/dashboard");
      } else if (user.role === "INSTRUCTOR") {
        router.push("/instructor/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    } catch (error) {
      console.error(error);

      alert(error?.response?.data?.message || "Login failed");
    }
  };

  return (
    <AuthLayout title="Login" subtitle="Access your learning dashboard">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          type="email"
          name="email"
          placeholder="Enter your email"
          onChange={handleChange}
        />

        <AuthInput
          type="password"
          name="password"
          placeholder="Enter your password"
          onChange={handleChange}
        />
        <div className="text-right">
          <a href="/forgot-password" className="text-orange-500 text-sm">
            Forgot Password?
          </a>
        </div>
        <button
          type="submit"
          className="
            w-full
            rounded-lg
            bg-orange-600
            py-3
            font-semibold
            text-white
            hover:bg-orange-700
            transition
          "
        >
          Login
        </button>

        <p className="text-center text-slate-400 text-sm">
          Don't have an account?{" "}
          <a href="/register" className="text-orange-500">
            Register
          </a>
        </p>
      </form>
    </AuthLayout>
  );
}
