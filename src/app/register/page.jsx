"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import useAuth from "@/hooks/useAuth";

import AuthLayout from "@/components/auth/AuthLayout";
import AuthInput from "@/components/auth/AuthInput";

export default function RegisterPage() {
  const router = useRouter();

  const { register } = useAuth();

  const [formData, setFormData] =
    useState({
      name: "",
      email: "",
      phoneNumber: "",
      address: "",
      password: "",
      confirmPassword: "",
      role: "STUDENT",
    });

  const [error, setError] =
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

      setError("");

      if (
        formData.password !==
        formData.confirmPassword
      ) {
        setError(
          "Passwords do not match"
        );

        return;
      }

      try {
        await register({
          name:
            formData.name,
          email:
            formData.email,
          phoneNumber:
            formData.phoneNumber,
          address:
            formData.address,
          password:
            formData.password,
          role:
            formData.role,
        });

        router.push(
          "/login"
        );
      } catch (error) {
        setError(
          error.response?.data
            ?.message ||
            "Registration failed"
        );
      }
    };

  return (
    <AuthLayout
      title="Register"
      subtitle="Create your account"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {error && (
          <div className="bg-red-600 text-white p-3 rounded-lg">
            {error}
          </div>
        )}

        <AuthInput
          type="text"
          name="name"
          placeholder="Full Name"
          value={
            formData.name
          }
          onChange={
            handleChange
          }
        />

        <AuthInput
          type="email"
          name="email"
          placeholder="Email"
          value={
            formData.email
          }
          onChange={
            handleChange
          }
        />

        <AuthInput
          type="text"
          name="phoneNumber"
          placeholder="Phone Number"
          value={
            formData.phoneNumber
          }
          onChange={
            handleChange
          }
        />

        <AuthInput
          type="text"
          name="address"
          placeholder="Address"
          value={
            formData.address
          }
          onChange={
            handleChange
          }
        />

        <AuthInput
          type="password"
          name="password"
          placeholder="Password"
          value={
            formData.password
          }
          onChange={
            handleChange
          }
        />

        <AuthInput
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          value={
            formData.confirmPassword
          }
          onChange={
            handleChange
          }
        />

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
          Register
        </button>

        <p className="text-center text-slate-400 text-sm">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-orange-500"
          >
            Login
          </a>
        </p>
      </form>
    </AuthLayout>
  );
}