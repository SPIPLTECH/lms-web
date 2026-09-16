"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import SubmissionGauge from "@/components/ui/SubmissionGauge";
import GradableBreadcrumb from "@/components/instructor/assignments/GradableBreadcrumb";

/**
 * One gradable item as a dense list row: where it lives, what it is called, and
 * how much of the class has handed it in. The whole row is a link into that
 * item's own page, where the per-student list lives.
 *
 * Shared by the assignment list and the Final-test list — the row is identical
 * between them, only the page it opens differs.
 *
 * `actions` sits OUTSIDE the link so Edit and Delete do not navigate.
 */
export default function GradableRow({ href, breadcrumb, title, gauge, badges = [], actions }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-foreground/[0.04]">
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-2">
        <span className="min-w-0">
          <GradableBreadcrumb item={breadcrumb} />
          {title && (
            <span className="mt-0.5 block truncate text-[10px] font-semibold text-muted-foreground">
              {title}
            </span>
          )}
        </span>
      </Link>

      <div className="flex shrink-0 items-center gap-2.5">
        {badges.map((badge) => (
          <span
            key={badge.label}
            className={`hidden whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider sm:inline ${badge.tone}`}
          >
            {badge.label}
          </span>
        ))}
        {gauge && <SubmissionGauge {...gauge} />}
        {actions}
        <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
      </div>
    </div>
  );
}
