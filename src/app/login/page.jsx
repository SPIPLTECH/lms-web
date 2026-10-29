"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiOutlineLockClosed } from "@/components/ui/reactIcons";

import useAuth from "@/hooks/useAuth";

import AuthLayout from "@/components/auth/AuthLayout";
import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthAlert from "@/components/auth/AuthAlert";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";
import GoogleSignInButton, { isGoogleSignInEnabled } from "@/components/auth/GoogleSignInButton";
import { consumeLoginReason, signInErrorMessage } from "@/lib/sessionErrors";
import { subscribeSignedIn } from "@/lib/authBroadcast";
import { hasSignedInBefore, subscribeReturningUser } from "@/lib/returningUser";

// The server can't see this browser's storage, so it renders a blank heading
// (null) rather than a guess that would flash to the other text.
const HEADINGS = {
  returning: { title: "Welcome Back", description: "Sign in to continue your learning journey." },
  new: { title: "Sign In", description: "Sign in to start your learning journey." },
  unknown: { title: " ", description: " " },
};

export default function LoginPage() {
  const router = useRouter();
  const { login, googleLogin, user, loading: authLoading } = useAuth();

  const signedInBefore = useSyncExternalStore(subscribeReturningUser, hasSignedInBefore, () => null);
  const heading = HEADINGS[signedInBefore === null ? "unknown" : signedInBefore ? "returning" : "new"];

  useEffect(() => {
    console.log("[LOGIN] page mounted");
    return () => console.log("[LOGIN] page unmounted");
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  // Sent here after the session ended (expired, revoked, signed out in
  // another tab): say why — once. The reason is taken out of the URL so a
  // reload, Back or a bookmark does not show an old message again.
  useEffect(() => {
    const { message, url, changed } = consumeLoginReason(window.location.href);
    if (message) setError(message);
    if (changed) window.history.replaceState(window.history.state, "", url);
  }, []);

  // Signed in from another tab: whatever this page was showing is over.
  useEffect(() => subscribeSignedIn(() => setError("")), []);

  // Auto-redirect to dashboard if user is already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      redirectAfterSignIn(user);
    }
  }, [user, authLoading]);

  const redirectAfterSignIn = (user) => {
    switch (user.role) {
      case "ADMIN":
        router.replace("/admin/dashboard");
        return true;

      case "INSTRUCTOR":
        // Instructors land on My Courses (the "Teaching" section) rather than
        // the dashboard — courses are the first thing they act on.
        router.replace("/instructor/courses");
        return true;

      case "STUDENT": {
        const params = new URLSearchParams(window.location.search);
        const returnTo = params.get("returnTo") || sessionStorage.getItem("intended_course_return");
        if (returnTo) {
          sessionStorage.removeItem("intended_course_return");
        }
        router.replace(returnTo || "/student/my-courses");
        return true;
      }

      default:
        setError(`Unknown role: ${user.role}`);
        return false;
    }
  };

  const handleGoogleCredential = async (credential) => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const user = await googleLogin(credential);
      if (!redirectAfterSignIn(user)) setLoading(false);
    } catch (err) {
      setError(signInErrorMessage(err, "Google sign-in failed. Please try again."));
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    // The user is acting on the message; don't leave it over the new attempt.
    if (error) setError("");
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

      if (!redirectAfterSignIn(user)) setLoading(false);
    } catch (error) {
      const message = error.response?.data?.message || "Login failed";

      if (message === "Verify email first") {
        router.replace(
          `/verify-otp?email=${encodeURIComponent(formData.email.trim())}`,
        );
        return;
      }

      setError(signInErrorMessage(error, "Invalid email or password."));
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard>
        <AuthHeader
          icon={<HiOutlineLockClosed className="text-4xl text-primary" />}
          title={heading.title}
          description={heading.description}
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

          {isGoogleSignInEnabled() && (
            <>
              <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>
              <GoogleSignInButton onCredential={handleGoogleCredential} disabled={loading} />
            </>
          )}

        </form>
      </AuthCard>
    </AuthLayout>
  );
}
