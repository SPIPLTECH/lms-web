"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import useAuth from "@/hooks/useAuth";

import AuthLayout from "@/components/auth/AuthLayout";
import AuthInput from "@/components/auth/AuthInput";

export default function RegisterPage() {
const router = useRouter();

const { register } =
useAuth();

const [formData, setFormData] =
useState({
name: "",
email: "",
password: "",
});

const handleChange = (e) => {
setFormData({
...formData,
[e.target.name]:
e.target.value,
});
};

const handleSubmit = async (
e
) => {
e.preventDefault();

try {
  await register(
    formData
  );

  alert(
    "Registration successful"
  );

  router.push(
    "/login"
  );
} catch (error) {
  alert(
    error?.response?.data
      ?.message ||
      "Registration failed"
  );
}


};

return ( <AuthLayout
   title="Register"
   subtitle="Create your LMS account"
 > <form
     onSubmit={handleSubmit}
     className="space-y-4"
   > <AuthInput
       type="text"
       name="name"
       placeholder="Full Name"
       onChange={handleChange}
     />

    <AuthInput
      type="email"
      name="email"
      placeholder="Email Address"
      onChange={handleChange}
    />

    <AuthInput
      type="password"
      name="password"
      placeholder="Password"
      onChange={handleChange}
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
      Create Account
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
