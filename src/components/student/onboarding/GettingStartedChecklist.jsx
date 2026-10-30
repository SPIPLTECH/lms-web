"use client";

import { useState } from "react";
import { Check, ChevronDown, Compass } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useStudentTour } from "@/context/StudentTourContext";
import { needsOnboarding } from "@/lib/studentOnboarding";
import { TOUR_CHECKLIST } from "@/components/student/onboarding/StudentTour";

/**
 * Getting started, under the new-student banner on My Courses: one row per
 * part of the tour, each opening the tour at that part. Ticks are the parts
 * this browser has seen. Collapsed by default, because My Courses fits the
 * screen and the course card is what it is for. Shown only while onboarding
 * is not done; it goes away with the banner.
 */
export default function GettingStartedChecklist() {
  const { user } = useAuth();
  const tour = useStudentTour();
  const [open, setOpen] = useState(true);

  if (!needsOnboarding(user) || !tour.canStart) return null;

  const done = TOUR_CHECKLIST.filter((item) => tour.seen[item.key]).length;
  const total = TOUR_CHECKLIST.length;
  const circumference = 2 * Math.PI * 15;

  return (
    <section className="rounded-2xl border border-border bg-card" aria-label="Getting started">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left cursor-pointer"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-link/10 text-link">
          <Compass size={18} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-foreground">Getting started</span>
          <span className="block text-xs text-muted-foreground">
            {done} of {total} seen · each one opens that part of the tour
          </span>
        </span>
        <span className="relative ml-auto grid h-10 w-10 shrink-0 place-items-center" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 38 38">
            <circle cx="19" cy="19" r="15" fill="none" stroke="var(--border)" strokeWidth="4" />
            <circle
              cx="19" cy="19" r="15" fill="none" stroke="var(--link)" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={circumference * (1 - done / total)}
              transform="rotate(-90 19 19)"
            />
          </svg>
          <span className="absolute text-[10px] font-bold text-muted-foreground">{Math.round((done / total) * 100)}%</span>
        </span>
        <ChevronDown size={18} className={`shrink-0 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`} aria-hidden="true" />
      </button>

      {open && (
        <ul className="grid gap-0.5 border-t border-border p-1.5 md:grid-cols-2">
          {TOUR_CHECKLIST.map((item) => {
            const seen = Boolean(tour.seen[item.key]);
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => tour.start(item.key)}
                  className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-muted cursor-pointer"
                >
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${
                      seen ? "border-success bg-success text-success-foreground" : "border-border"
                    }`}
                  >
                    {seen && <Check size={12} aria-hidden="true" />}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-semibold ${seen ? "text-muted-foreground line-through" : "text-foreground"}`}>{item.label}</span>
                    <span className="block text-xs text-muted-foreground">{item.desc}</span>
                  </span>
                  <span className="ml-auto whitespace-nowrap text-xs font-bold text-link">{seen ? "Replay" : "Show me"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
