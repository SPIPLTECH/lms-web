"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Clock, ExternalLink, FlaskConical, LogOut, RefreshCw } from "lucide-react";

import useAuth from "@/hooks/useAuth";
import useEvaluatorState from "@/hooks/useEvaluatorState";
import useEvaluatorStatus from "@/hooks/queries/evaluator/useEvaluatorStatus";
import useCheckEvaluatorFeedback from "@/hooks/queries/evaluator/useCheckEvaluatorFeedback";
import { EVALUATOR_MESSAGES, EVALUATOR_STATES, formatEvaluatorDeadline } from "@/lib/evaluatorAccess";

import AuthLayout from "@/components/auth/AuthLayout";
import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthAlert from "@/components/auth/AuthAlert";
import Button from "@/components/ui/Button";
import Loader from "@/components/common/Loader";
import { useToast } from "@/components/ui/ToastProvider";

// Coming back to this tab after opening the form re-checks automatically, at
// most this often (the server also rate-limits the check).
const AUTO_CHECK_INTERVAL_MS = 30 * 1000;

const homeFor = (role) =>
  role === "ADMIN" ? "/admin/dashboard" : role === "INSTRUCTOR" ? "/instructor/courses" : "/student/my-courses";

/**
 * Where evaluator accounts land once their 2 days are over (asking for the
 * feedback if it hasn't been given), and the one place feedback completion is
 * confirmed, during the 2 days or after. Reads its status straight from
 * the server (GET /evaluators/me/status), not from the cached profile.
 */
export default function EvaluatorAccessPage() {
  const router = useRouter();
  const { user, loading, logout, refreshUser } = useAuth();
  const { showToast } = useToast();
  const { data: status, isLoading, error } = useEvaluatorStatus({ enabled: Boolean(user) });
  const checkMutation = useCheckEvaluatorFeedback();
  const state = useEvaluatorState(status);

  const [checkMessage, setCheckMessage] = useState({ type: "", text: "" });
  const [continuing, setContinuing] = useState(false);
  const formOpenedRef = useRef(false);
  const lastCheckRef = useRef(0);

  const notEvaluator = error?.response?.status === 404;

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (notEvaluator) router.replace(homeFor(user.role));
  }, [loading, user, notEvaluator, router]);

  const runCheck = async ({ silent = false } = {}) => {
    if (checkMutation.isPending) return;
    lastCheckRef.current = Date.now();
    if (!silent) setCheckMessage({ type: "", text: "" });
    try {
      const response = await checkMutation.mutateAsync();
      if (response.data?.found) {
        setCheckMessage({ type: "", text: "" });
      } else if (!silent) {
        setCheckMessage({
          type: "info",
          text: `No submission found yet for ${user?.email}. Make sure you used this email on the feedback form, then check again.`,
        });
      }
    } catch (err) {
      if (!silent) {
        setCheckMessage({
          type: "error",
          text: err.response?.data?.message || "Could not check right now. Please try again in a minute.",
        });
      }
    }
  };

  // After the evaluator opens the form in another tab and comes back here,
  // look for the submission without making them click.
  const runCheckRef = useRef(runCheck);
  useEffect(() => {
    runCheckRef.current = runCheck;
  });
  useEffect(() => {
    if (!status || status.feedbackCompleted) return undefined;
    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        formOpenedRef.current &&
        Date.now() - lastCheckRef.current > AUTO_CHECK_INTERVAL_MS
      ) {
        runCheckRef.current({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [status]);

  const handleContinue = async () => {
    setContinuing(true);
    // The student pages gate on the session profile; re-read it so they see
    // the confirmed feedback.
    await refreshUser();
    router.replace("/student/my-courses");
  };

  // logout() keeps the user signed in (and says why) if the server could not
  // end the session — show that, as the navigation menus do.
  const handleSignOut = async () => {
    const result = await logout();
    if (result?.ok === false) showToast(result.message, "error");
  };

  const signOut = (
    <button
      type="button"
      onClick={handleSignOut}
      className="mx-auto flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground cursor-pointer"
    >
      <LogOut size={14} aria-hidden="true" /> Sign out
    </button>
  );

  if (loading || !user || notEvaluator || (isLoading && !status)) {
    return (
      <AuthLayout>
        <div className="flex justify-center py-10">
          <Loader />
        </div>
      </AuthLayout>
    );
  }

  if (error || !status) {
    return (
      <AuthLayout>
        <AuthCard>
          <AuthAlert type="error" message="Could not load your evaluator status. Please refresh the page." />
          <div className="mt-6">{signOut}</div>
        </AuthCard>
      </AuthLayout>
    );
  }

  const deadline = formatEvaluatorDeadline(status.expiresAt);
  const expired = state === EVALUATOR_STATES.EXPIRED;

  const continueButton = (
    <Button className="w-full" onClick={handleContinue} loading={continuing}>
      Continue to My Courses
    </Button>
  );

  // Feedback recorded: the confirmation (during the 2 days) or the closing
  // thank-you (after them). No more feedback prompts.
  if (status.feedbackCompleted) {
    return (
      <AuthLayout>
        <AuthCard>
          <AuthHeader
            icon={<CircleCheck className="h-9 w-9 text-primary" aria-hidden="true" />}
            title={expired ? "Testing Period Ended" : "Feedback Recorded"}
          />
          <p role="status" className="mt-6 text-center text-sm leading-relaxed text-foreground">
            {expired ? EVALUATOR_MESSAGES.expiredWithFeedback : EVALUATOR_MESSAGES.feedbackRecorded}
          </p>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {expired ? `Access ended ${deadline}.` : `Access ends ${deadline}.`}
          </p>
          {!expired && <div className="mt-8">{continueButton}</div>}
          <div className="mt-6 border-t border-border pt-5">{signOut}</div>
        </AuthCard>
      </AuthLayout>
    );
  }

  // No feedback yet. After the 2 days this is where the evaluator lands; during
  // them it is optional (reached from the reminder on the student pages).
  return (
    <AuthLayout>
      <AuthCard>
        <AuthHeader
          icon={
            expired ? (
              <Clock className="h-9 w-9 text-primary" aria-hidden="true" />
            ) : (
              <FlaskConical className="h-9 w-9 text-primary" aria-hidden="true" />
            )
          }
          title={expired ? "Feedback Required" : "Share Your Feedback"}
          description={
            expired
              ? EVALUATOR_MESSAGES.expired
              : "When you have finished evaluating, please complete the independent evaluation feedback form."
          }
        />

        <div className="mt-6 space-y-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
          {expired && <p className="text-sm font-semibold text-foreground">Please share your feedback on the evaluation.</p>}
          <p>
            The form is on a separate website, not the LMS&apos;s own Feedback section. Use this email on it so we can
            match your submission:
          </p>
          <p className="break-all text-sm font-semibold text-primary">{user.email}</p>
          <p>
            {expired ? "Your 2-day testing period ended " : "Your testing account is available for 2 days from registration and ends "}
            <strong className="text-foreground">{deadline}</strong>.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {status.feedbackUrl ? (
            <Button asChild className="flex w-full items-center justify-center gap-2">
              <a
                href={status.feedbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  formOpenedRef.current = true;
                }}
              >
                <ExternalLink size={16} aria-hidden="true" />
                You Need to Give Feedback
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Button>
          ) : (
            <AuthAlert type="error" message="The feedback form link is not configured yet. Please contact the LMS team." />
          )}

          <Button
            variant="outline"
            className="flex w-full items-center justify-center gap-2"
            onClick={() => runCheck()}
            disabled={checkMutation.isPending}
          >
            <RefreshCw size={16} aria-hidden="true" className={checkMutation.isPending ? "animate-spin" : ""} />
            {checkMutation.isPending ? "Checking..." : "I've submitted it. Check now"}
          </Button>

          <div aria-live="polite">
            <AuthAlert type={checkMessage.type || "info"} message={checkMessage.text} />
          </div>

          {!expired && continueButton}
        </div>

        <div className="mt-6 border-t border-border pt-5">{signOut}</div>
      </AuthCard>
    </AuthLayout>
  );
}
