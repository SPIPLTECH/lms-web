"use client";

import Link from "next/link";
import { MonitorSmartphone } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Loader from "@/components/common/Loader";
import useContentAccess from "@/hooks/queries/student/useContentAccess";
import { SESSION_ERROR_CODES, messageForCode } from "@/lib/sessionErrors";

/**
 * Wraps a STUDENT course-content page. While another device of the account
 * is playing (the account's playback lease is held elsewhere), the page's
 * content is not rendered at all — viewers and players unmount, and cached
 * course content is dropped (useContentAccess) — and this explains why, with
 * a "Try again" that re-checks. The URL is left as it is, so the student
 * returns to the same place once access resumes.
 *
 * This is not a sign-in problem: the student stays signed in.
 */
export default function ContentAccessGuard({ enabled = true, children }) {
  const { blocked, checking, loadingInitial, isError, retry } = useContentAccess({ enabled });

  if (enabled && loadingInitial) {
    return (
      <div className="flex h-full min-h-[60vh] w-full items-center justify-center p-4">
        <Loader />
      </div>
    );
  }

  if (enabled && isError) {
    return (
      <div className="flex h-full min-h-[60vh] w-full items-center justify-center p-4">
        <Card tone="flat" className="w-full max-w-lg space-y-4 text-center" role="alert">
          <MonitorSmartphone className="mx-auto h-10 w-10 text-rose-500" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-foreground">Unable to verify content access</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We could not verify your device access status. Please check your connection and try again.
          </p>
          <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Button type="button" onClick={retry} disabled={checking}>
              {checking ? "Checking…" : "Try again"}
            </Button>
            <Link href="/student/my-courses" className="text-sm font-medium text-primary hover:underline">
              Go to My Courses
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (!blocked) return children;

  return (
    <div className="flex h-full min-h-[60vh] w-full items-center justify-center p-4">
      <Card tone="flat" className="w-full max-w-lg space-y-4 text-center" role="alert">
        <MonitorSmartphone className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-foreground">Course content is open on another device</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {messageForCode(SESSION_ERROR_CODES.CONTENT_ACTIVE_ON_ANOTHER_DEVICE)}
        </p>
        <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Button type="button" onClick={retry} disabled={checking}>
            {checking ? "Checking…" : "Try again"}
          </Button>
          <Link href="/student/my-courses" className="text-sm font-medium text-primary hover:underline">
            Go to My Courses
          </Link>
        </div>
      </Card>
    </div>
  );
}
