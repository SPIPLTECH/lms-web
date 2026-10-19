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

// Coming back to this tab after opening the form re-checks automatically, at
// most this often (the server also rate-limits the check).
const AUTO_CHECK_INTERVAL_MS = 30 * 1000;

const homeFor = (role) =>
  role === "ADMIN" ? "/admin/dashboard" : role === "INSTRUCTOR" ? "/instructor/courses" : "/student/my-courses";

/**
 * Where evaluator accounts land whenever learning access is closed, and the
 * one place feedback completion is confirmed. Reads its status straight from
 * the server (GET /evaluators/me/status), not from the cached profile.
 */
export default function EvaluatorAccessPage() {
  const router = useRouter();
  const { user, loading, logout, refreshUser } = useAuth();
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
    if (state !== EVALUATOR_STATES.FEEDBACK_REQUIRED) return undefined;
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
  }, [state]);

  const handleContinue = async () => {
    setContinuing(true);
    // The student pages gate on the session profile; re-read it so they see
    // the confirmed feedback.
    await refreshUser();
    router.replace("/student/my-courses");
  };

  const signOut = (
    <button
      type="button"
      onClick={logout}
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

  if (state === EVALUATOR_STATES.EXPIRED) {
    return (
      <AuthLayout>
        <AuthCard>
          <AuthHeader
            icon={<Clock className="h-9 w-9 text-primary" aria-hidden="true" />}
            title="Testing Period Ended"
          />
          <p role="status" className="mt-6 text-center text-sm leading-relaxed text-foreground">
            {status.feedbackCompleted ? EVALUATOR_MESSAGES.expiredWithFeedback : EVALUATOR_MESSAGES.expired}
          </p>
          <p className="mt-3 text-center text-xs text-muted-foreground">Access ended {deadline}.</p>
          <div className="mt-8 border-t border-border pt-5">{signOut}</div>
        </AuthCard>
      </AuthLayout>
    );
  }

  if (state === EVALUATOR_STATES.ACTIVE) {
    return (
      <AuthLayout>
        <AuthCard>
          <AuthHeader
            icon={<CircleCheck className="h-9 w-9 text-primary" aria-hidden="true" />}
            title="Feedback Recorded"
          />
          <p role="status" className="mt-6 text-center text-sm leading-relaxed text-foreground">
            {EVALUATOR_MESSAGES.feedbackRecorded}
          </p>
          <p className="mt-3 text-center text-xs text-muted-foreground">Access ends {deadline}.</p>
          <Button className="mt-8 w-full" onClick={handleContinue} loading={continuing}>
            Continue to My Courses
          </Button>
          <div className="mt-6 border-t border-border pt-5">{signOut}</div>
        </AuthCard>
      </AuthLayout>
    );
  }

  // FEEDBACK_REQUIRED
  return (
    <AuthLayout>
      <AuthCard>
        <AuthHeader
          icon={<FlaskConical className="h-9 w-9 text-primary" aria-hidden="true" />}
          title="Feedback Required"
          description="To continue using Orange Tree LMS, complete the independent evaluation feedback form."
        />

        <div className="mt-6 space-y-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
          <p>
            The form is on a separate website, not the LMS&apos;s own Feedback section. Use this email on it so we can
            match your submission:
          </p>
          <p className="break-all text-sm font-semibold text-primary">{user.email}</p>
          <p>
            Your testing account is available for 2 days from registration and ends{" "}
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
        </div>

        <div className="mt-6 border-t border-border pt-5">{signOut}</div>
      </AuthCard>
    </AuthLayout>
  );
}
