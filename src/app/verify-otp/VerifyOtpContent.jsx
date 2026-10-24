"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HiOutlineShieldCheck } from "@/components/ui/reactIcons";

import { verifyOtp, resendVerificationOtp } from "@/services/auth.service";
import { clearSignedIn } from "@/lib/returningUser";

import AuthLayout from "@/components/auth/AuthLayout";
import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthAlert from "@/components/auth/AuthAlert";
import AuthInput from "@/components/auth/AuthInput";
import Countdown from "@/components/auth/Countdown";
import AuthButton from "@/components/auth/AuthButton";
import AuthFooter from "@/components/auth/AuthFooter";

export default function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams?.get("email") || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (!email) {
      router.replace("/login");
    }
  }, [email, router]);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (otp.trim().length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const response = await verifyOtp({
        email,
        otp: otp.trim(),
      });

      setSuccess(response.message || "Email verified successfully.");
      // A newly registered account: the login page should say "Sign In",
      // not "Welcome Back", even if someone signed in on this browser before.
      clearSignedIn();

      setTimeout(() => {
        router.replace("/login");
      }, 1500);
    } catch (error) {
      setError(error.response?.data?.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setSuccess("");

    setResending(true);

    try {
      const response = await resendVerificationOtp(email);

      setSuccess(response.message || "OTP sent successfully.");

      setCountdown(60);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to resend OTP. Please try again.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard>
        <AuthHeader
          icon={<HiOutlineShieldCheck className="text-4xl text-primary" />}
          title="Verify Your Email"
          description="Enter the verification code sent to your email address."
        />

        {email && (
          <div className="mt-5 text-center">
            <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
              <span className="break-all text-sm font-medium text-primary">
                {email}
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <AuthAlert type="error" message={error} />

          <AuthAlert type="success" message={success} />

          <AuthInput
            label="Verification Code"
            type="text"
            name="otp"
            placeholder="Enter the 6-digit verification code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            maxLength={6}
            required
          />

          <Countdown
            seconds={countdown}
            loading={resending}
            onResend={handleResendOtp}
          />

          <AuthButton
            type="submit"
            loading={loading}
            loadingText="Verifying..."
            disabled={otp.length !== 6}
          >
            Verify Email
          </AuthButton>

          <AuthFooter
            question="Already verified?"
            actionHref="/login"
            actionText="Login"
          />
        </form>
      </AuthCard>
    </AuthLayout>
  );
  // Paste the rest of your existing code unchanged.
}
