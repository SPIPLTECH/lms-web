"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiOutlineLockClosed } from "@/components/ui/reactIcons";

import useAuth from "@/hooks/useAuth";

import AuthLayout from "@/components/auth/AuthLayout";
import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthAlert from "@/components/auth/AuthAlert";
import AuthInput from "@/components/auth/AuthInput";
import AuthFooter from "@/components/auth/AuthFooter";
import AuthButton from "@/components/auth/AuthButton";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    console.log("[LOGIN] page mounted");
    return () => console.log("[LOGIN] page unmounted");
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validations
    const errors = {};
    if (!formData.email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Please enter a valid email address.";
    }
    if (!formData.password) {
      errors.password = "Password is required.";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    setValidationErrors({});
    setError("");

    try {
      const user = await login({
        email: formData.email.trim(),
        password: formData.password,
      });

      switch (user.role) {
        case "ADMIN":
          router.replace("/admin/dashboard");
          break;

        case "INSTRUCTOR":
          // Instructors land on My Courses (the "Teaching" section) rather than
          // the dashboard — courses are the first thing they act on.
          router.replace("/instructor/courses");
          break;

        case "STUDENT": {
          let returnTo = null;
          if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            returnTo = params.get("returnTo") || sessionStorage.getItem("intended_course_return");
            if (returnTo) {
              sessionStorage.removeItem("intended_course_return");
            }
          }
          router.replace(returnTo || "/student/my-courses");
          break;
        }

        default:
          setError(`Unknown role: ${user.role}`);
          setLoading(false);
          return;
      }
    } catch (error) {
      const message = error.response?.data?.message || "Login failed";

      if (message === "Verify email first") {
        router.replace(
          `/verify-otp?email=${encodeURIComponent(formData.email.trim())}`,
        );
        return;
      }

      setError("Invalid email or password.");
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard>
        <AuthHeader
          icon={<HiOutlineLockClosed className="text-4xl text-primary" />}
          title="Welcome Back"
          description="Sign in to continue your learning journey."
        />

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
          <AuthAlert type="error" message={error} />

          <div>
            <AuthInput
              label="Email"
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            {validationErrors.email && (
              <p className="text-red-500 text-[11px] font-semibold mt-1.5 px-1 text-left animate-in fade-in duration-150">
                {validationErrors.email}
              </p>
            )}
          </div>

          <div>
            <AuthInput
              label="Password"
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            {validationErrors.password && (
              <p className="text-red-500 text-[11px] font-semibold mt-1.5 px-1 text-left animate-in fade-in duration-150">
                {validationErrors.password}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:text-primary"
            >
              Forgot Password?
            </Link>
          </div>

          <AuthButton type="submit" loading={loading} loadingText="Signing In...">
            Login
          </AuthButton>

          <AuthFooter
            question="Don't have an account?"
            actionHref="/register"
            actionText="Register"
          />
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
