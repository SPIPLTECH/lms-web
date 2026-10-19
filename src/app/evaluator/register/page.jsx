"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";

import useEvaluatorRegistration from "@/hooks/queries/evaluator/useEvaluatorRegistration";
import useRegisterEvaluator from "@/hooks/queries/evaluator/useRegisterEvaluator";

import AuthLayout from "@/components/auth/AuthLayout";
import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthAlert from "@/components/auth/AuthAlert";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";
import AuthFooter from "@/components/auth/AuthFooter";
import Loader from "@/components/common/Loader";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;

// Same rules as the backend's registerSchema (auth.validation.js).
const validate = (form) => {
  const errors = {};
  const name = form.name.trim();
  if (name.length < 2 || name.length > 100) errors.name = "Name must be 2 to 100 characters.";
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = "Please enter a valid email address.";
  if (form.phoneNumber.trim() && !PHONE_PATTERN.test(form.phoneNumber.trim())) {
    errors.phoneNumber = "Phone number must be 7 to 15 digits.";
  }
  if (form.password.length < 8 || form.password.length > 128) {
    errors.password = "Password must be 8 to 128 characters.";
  }
  if (form.confirmPassword !== form.password) errors.confirmPassword = "Passwords do not match.";
  return errors;
};

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-red-500 text-[11px] font-semibold mt-1.5 px-1 text-left">{message}</p>;
}

export default function EvaluatorRegisterPage() {
  const router = useRouter();
  const { data: registration, isLoading, isError } = useEvaluatorRegistration();
  const registerMutation = useRegisterEvaluator();
  // A double click fires two submits before React re-renders the disabled button.
  const submittingRef = useRef(false);

  const [form, setForm] = useState({ name: "", email: "", phoneNumber: "", password: "", confirmPassword: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;

    const errors = validate(form);
    setFieldErrors(errors);
    setError("");
    if (Object.keys(errors).length) return;

    submittingRef.current = true;
    try {
      const email = form.email.trim();
      await registerMutation.mutateAsync({
        name: form.name.trim(),
        email,
        password: form.password,
        ...(form.phoneNumber.trim() ? { phoneNumber: form.phoneNumber.trim() } : {}),
      });
      // Same email verification as every other account; login comes after.
      router.replace(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.request ? "Could not reach the server. Please check your connection." : "Registration failed.")
      );
      submittingRef.current = false;
    }
  };

  const header = (
    <AuthHeader
      icon={<FlaskConical className="h-9 w-9 text-primary" aria-hidden="true" />}
      title="Evaluator Registration"
      description="Create a temporary testing account for the Orange Tree LMS evaluation."
    />
  );

  if (isLoading) {
    return (
      <AuthLayout>
        <div className="flex justify-center py-10">
          <Loader />
        </div>
      </AuthLayout>
    );
  }

  if (isError || !registration?.open) {
    return (
      <AuthLayout>
        <AuthCard>
          {header}
          <div className="mt-8 space-y-6">
            <AuthAlert
              type={isError ? "error" : "info"}
              message={
                isError
                  ? "Could not check whether evaluator registration is open. Please try again later."
                  : "Evaluator registration is not open right now."
              }
            />
            <AuthFooter backHref="/login" backText="Back to login" />
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard>
        {header}

        <ul className="mt-6 space-y-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
          <li>
            Access lasts <strong className="text-foreground">2 days ({registration.accessHours} hours) from registration</strong>.
            It is not extended or restarted.
          </li>
          <li>You are enrolled in C-CAT Section A and Section B automatically.</li>
          <li>
            Before you can use the LMS you must complete the independent evaluation feedback form,{" "}
            <strong className="text-foreground">using the same email address you register with here</strong>.
          </li>
        </ul>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          <AuthAlert type="error" message={error} />

          <div>
            <AuthInput type="text" name="name" placeholder="Full name" value={form.name} onChange={handleChange} autoComplete="name" aria-label="Full name" required />
            <FieldError message={fieldErrors.name} />
          </div>

          <div>
            <AuthInput type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} autoComplete="email" aria-label="Email" required />
            <FieldError message={fieldErrors.email} />
          </div>

          <div>
            <AuthInput type="tel" name="phoneNumber" placeholder="Phone number (optional)" value={form.phoneNumber} onChange={handleChange} autoComplete="tel" aria-label="Phone number (optional)" />
            <FieldError message={fieldErrors.phoneNumber} />
          </div>

          <div>
            <AuthInput type="password" name="password" placeholder="Password (at least 8 characters)" value={form.password} onChange={handleChange} autoComplete="new-password" aria-label="Password" required />
            <FieldError message={fieldErrors.password} />
          </div>

          <div>
            <AuthInput type="password" name="confirmPassword" placeholder="Confirm password" value={form.confirmPassword} onChange={handleChange} autoComplete="new-password" aria-label="Confirm password" required />
            <FieldError message={fieldErrors.confirmPassword} />
          </div>

          <AuthButton type="submit" loading={registerMutation.isPending} loadingText="Creating account...">
            Create Evaluator Account
          </AuthButton>

          <AuthFooter question="Already registered?" actionHref="/login" actionText="Log in" />
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
