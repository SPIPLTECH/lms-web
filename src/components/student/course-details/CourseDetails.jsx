"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Award, BookOpen, CheckCircle, ChevronDown, Map as MapIcon, MessageSquare, Play } from "lucide-react";

import { getDisplayUrl } from "@/lib/blob";

/**
 * The enrolled student's course details page: what the course is — category,
 * title, description and the key facts — beside its image, with the way in:
 * the course map (the main action) and the player's Continue.
 *
 * No syllabus and no progress here; the course map shows the structure.
 *
 * @param {object} props
 * @param {object} props.course          normalized course (normalizeCourseHierarchy)
 * @param {string} props.actionLabel     the Continue button's words
 * @param {boolean} props.hasNoContent   nothing to open yet (Continue disabled)
 * @param {boolean} props.isComplete     every step done: offers Feedback and Certificate
 * @param {() => void} props.onOpenMap   opens the course map
 * @param {() => void} props.onContinue  opens the player at the resume step
 */
export default function CourseDetails({ course, actionLabel, hasNoContent, isComplete, onOpenMap, onContinue }) {
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

  const modules = course.modules || [];
  const lessons = modules.flatMap((m) => m.lessons || []);
  const description = course.description || "";
  const isLongDescription = description.length > 320;
  // Shown at most about half a page wide: a 1280 px copy, not the full upload.
  const courseImage = course.thumbnailUrl ? getDisplayUrl(course.thumbnailUrl, { width: 1280 }) : null;

  const facts = [
    course.creator?.name && { label: "Instructor", value: course.creator.name },
    course.level && { label: "Level", value: course.level },
    { label: "Modules", value: modules.length },
    { label: "Lessons", value: lessons.length },
    course.estimatedLearningHours && { label: "Est. time", value: `${course.estimatedLearningHours} h` },
  ].filter(Boolean);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-x-10">
      {/* ── Course identity ─────────────────────────────────────────── */}
      <header className="min-w-0 space-y-4">
        <div className="space-y-2">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            {course.category || "Course"}
          </p>
          <h1 className="font-display text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-4xl">
            {course.title}
          </h1>
        </div>

        {description && (
          <div className="max-w-2xl space-y-2">
            <p
              className={`whitespace-pre-line font-serif text-[17px] leading-relaxed text-muted-foreground ${
                !isDescriptionOpen && isLongDescription ? "line-clamp-4" : ""
              }`}
            >
              {description}
            </p>
            {isLongDescription && (
              <button
                type="button"
                onClick={() => setIsDescriptionOpen((v) => !v)}
                aria-expanded={isDescriptionOpen}
                className="inline-flex items-center gap-1 rounded text-sm font-semibold text-primary transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              >
                {isDescriptionOpen ? "Show less" : "Read the full description"}
                <ChevronDown
                  size={14}
                  className={`transition-transform ${isDescriptionOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
            )}
          </div>
        )}

        <dl className="flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-4">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0">
              <dt className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
                {fact.label}
              </dt>
              <dd className="mt-0.5 truncate text-sm font-semibold text-foreground">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      {/* ── Image and the way in ────────────────────────────────────── */}
      <aside>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:sticky lg:top-24">
          <div className="aspect-video w-full bg-muted">
            {courseImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={courseImage} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <BookOpen size={32} className="text-muted-foreground/30" aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="space-y-3 p-5">
            <button
              type="button"
              onClick={onOpenMap}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card cursor-pointer"
            >
              <MapIcon size={16} className="shrink-0" aria-hidden="true" />
              Open course map
              <ArrowRight
                size={14}
                className="shrink-0 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>

            {/* No ?item= — the player lands on the server's resume step. */}
            <button
              type="button"
              onClick={onContinue}
              disabled={hasNoContent}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play size={14} className="shrink-0 fill-current" aria-hidden="true" />
              {actionLabel}
            </button>

            {isComplete && (
              <div className="space-y-2.5 border-t border-border pt-3">
                <div className="flex items-center gap-2 text-xs font-bold text-primary">
                  <CheckCircle size={15} aria-hidden="true" />
                  <span>Curriculum 100% Completed!</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/student/feedback?courseId=${course.id}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary/50"
                  >
                    <MessageSquare size={13} className="text-primary" aria-hidden="true" />
                    Feedback
                  </Link>
                  <Link
                    href="/student/certificates"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary/50"
                  >
                    <Award size={13} className="text-primary" aria-hidden="true" />
                    Certificate
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
