"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import SubmissionGauge from "@/components/ui/SubmissionGauge";
import GradableBreadcrumb from "@/components/instructor/assignments/GradableBreadcrumb";

const LIST_PATH = "/instructor/assignments";

/**
 * Heading for one gradable item's own page: back out to the list, where the
 * item lives, what it is called, and the same gauge the list row showed.
 *
 * Repeating the gauge here is deliberate — it is the number the instructor
 * clicked in on, so it should still be on screen while they work through the
 * students underneath it.
 *
 * Going back rebuilds the list the way it was left. The list hands each row a
 * `from` param holding its own query (tab + course filter), which is replayed
 * here; `fallbackView` only covers a deep link that never came from the list,
 * so a Final test still returns to the Final test tab rather than to
 * assignments.
 */
export default function GradableDetailHeader({
  item,
  title,
  gauge,
  fallbackView = "assignments",
  isLoading = false,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const from = searchParams.get("from");
  const backHref = `${LIST_PATH}?${from || `view=${fallbackView}`}`;

  return (
    <div className="flex items-start gap-3">
      <button
        onClick={() => router.push(backHref)}
        aria-label="Back to the list"
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-transparent bg-muted text-foreground transition hover:border-primary"
      >
        <ArrowLeft size={16} />
      </button>

      <div className="min-w-0 flex-1">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <>
            <GradableBreadcrumb item={item} size="lg" />
            <h1 className="mt-1 text-base font-bold text-foreground">{title}</h1>
          </>
        )}
      </div>

      {gauge && !isLoading && <SubmissionGauge {...gauge} />}
    </div>
  );
}
