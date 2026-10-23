"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CircleCheck, CircleAlert } from "lucide-react";

import {
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} from "@/services/auth.service";
import { getNewPasswordError } from "@/lib/passwordPolicy";

import AuthLayout from "@/components/auth/AuthLayout";
import AuthCard from "@/components/auth/AuthCard";
import AuthAlert from "@/components/auth/AuthAlert";
import OtpInput from "@/components/auth/OtpInput";
import Countdown from "@/components/auth/Countdown";
import PasswordFields from "@/components/auth/PasswordFields";
import AuthButton from "@/components/auth/AuthButton";
import AuthFooter from "@/components/auth/AuthFooter";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;
const TOTAL_STEPS = 2;

// Backend messages that mean the OTP itself is no longer usable.
const OTP_ERRORS = ["Invalid OTP", "OTP expired"];

const OTP_ERROR_COPY = {
  "Invalid OTP": "That code isn't correct. Check the email and try again.",
  "OTP expired": "That code has expired. Request a new one below.",
};

function StepProgress({ current }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-medium text-muted-foreground">
        Step {current} of {TOTAL_STEPS}
      </p>
      <div
        className="mt-2 grid grid-cols-2 gap-1.5"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={current}
        aria-label="Password reset progress"
      >
        {Array.from({ length: TOTAL_STEPS }, (_, index) => (
          <span
            key={index}
            className={`h-1 rounded-full transition-colors ${
              index < current ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function StepHeading({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{children}</p>
    </div>
  );
}

export default function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") || "";

  // "otp" → enter and verify the emailed code; "password" → set the new one;
  // "done" → confirmation.
  const [step, setStep] = useState("otp");

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (step !== "otp" || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, step]);

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  const handleOtpChange = (next) => {
    setOtp(next);
    if (error) setError("");
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearMessages();

    if (otp.length !== OTP_LENGTH) {
      setError("Enter all 6 digits of the code.");
      return;
    }

    setLoading(true);

    try {
      await verifyResetOtp({ email, otp });
      setStep("password");
    } catch (error) {
      const message = error.response?.data?.message;
      setError(OTP_ERROR_COPY[message] || message || "We couldn't verify that code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    clearMessages();
    setResending(true);

    try {
      await forgotPassword(email);
      setOtp("");
      setNotice("We sent a new code. It replaces the previous one.");
      setCountdown(RESEND_SECONDS);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "We couldn't send a new code. Try again in a few minutes.",
      );
    } finally {
      setResending(false);
    }
  };

  const handleBack = () => {
    clearMessages();
    setNewPassword("");
    setConfirmPassword("");
    setStep("otp");
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearMessages();

    const passwordError = getNewPasswordError({ newPassword, confirmPassword });
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      await resetPassword({ email, otp, newPassword });
      setStep("done");
    } catch (error) {
      const message = error.response?.data?.message || "We couldn't reset your password. Try again.";

      if (OTP_ERRORS.includes(message)) {
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
        setStep("otp");
        setError(OTP_ERROR_COPY[message]);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <AuthLayout>
        <AuthCard>
          <CircleAlert className="h-9 w-9 text-destructive" aria-hidden="true" />
          <div className="mt-4">
            <StepHeading title="This reset link is incomplete">
              We need the email address the code was sent to. Request a new
              code to start again.
            </StepHeading>
          </div>
          <AuthButton type="button" onClick={() => router.push("/forgot-password")}>
            Request a new code
          </AuthButton>
        </AuthCard>
      </AuthLayout>
    );
  }

  if (step === "done") {
    return (
      <AuthLayout>
        <AuthCard>
          <CircleCheck className="h-9 w-9 text-success" aria-hidden="true" />
          <div className="mt-4" role="status">
            <StepHeading title="Password updated">
              The password for{" "}
              <span className="break-all font-medium text-foreground">{email}</span>{" "}
              has been changed. Sign in with your new password to continue.
            </StepHeading>
          </div>
          <AuthButton type="button" onClick={() => router.replace("/login")}>
            Sign in
          </AuthButton>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard>
        {step === "otp" ? (
          <form onSubmit={handleVerifyOtp} noValidate>
            <StepProgress current={1} />
            <StepHeading title="Reset your password">
              Enter the 6-digit code we sent to{" "}
              <span className="break-all font-medium text-foreground">{email}</span>
              .{" "}
              <Link href="/forgot-password" className="whitespace-nowrap font-medium !text-primary hover:underline">
                Use a different email
              </Link>
            </StepHeading>

            <div className="space-y-3">
              <OtpInput
                value={otp}
                onChange={handleOtpChange}
                length={OTP_LENGTH}
                disabled={loading}
                invalid={Boolean(error)}
                describedBy={error ? "otp-error" : undefined}
                autoFocus
              />

              <div id="otp-error">
                <AuthAlert type="error" message={error} />
              </div>
              <AuthAlert type="success" message={notice} />

              <Countdown
                inline
                seconds={countdown}
                loading={resending}
                onResend={handleResendOtp}
              />
            </div>

            <div className="mt-6">
              <AuthButton
                type="submit"
                loading={loading}
                loadingText="Verifying..."
                disabled={loading || otp.length !== OTP_LENGTH}
              >
                Continue
              </AuthButton>
            </div>

            <div className="mt-6">
              <AuthFooter
                question="Remembered your password?"
                actionHref="/login"
                actionText="Sign in"
              />
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} noValidate>
            <StepProgress current={2} />
            <StepHeading title="Create a new password">
              Choose a password you haven't used for this account before.
            </StepHeading>

            <div className="space-y-5">
              <PasswordFields
                idPrefix="reset-password"
                password={newPassword}
                confirmPassword={confirmPassword}
                onPasswordChange={(e) => setNewPassword(e.target.value)}
                onConfirmPasswordChange={(e) => setConfirmPassword(e.target.value)}
                showChecklist={false}
                autoFocus
              />

              <AuthAlert type="error" message={error} />
            </div>

            <div className="mt-6">
              <AuthButton
                type="submit"
                loading={loading}
                loadingText="Resetting password..."
              >
                Reset password
              </AuthButton>
            </div>

            <div className="mt-6 border-t border-border pt-5">
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-50"
              >
                <ArrowLeft size={15} aria-hidden="true" />
                Back to verification code
              </button>
            </div>
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
