"use client";

import { useState } from "react";
import { ArrowRight, BookOpen, Check, ChevronDown, ChevronRight, Lock, Play } from "lucide-react";

import { getDisplayUrl } from "@/lib/blob";

/**
 * The enrolled student's course page: what the course is, how far they are,
 * what comes next, and the syllabus. Each syllabus lesson opens the player at
 * that lesson; locks, completion and "Up next" all come from the player's own
 * learning sequence, so this page and the player never disagree.
 *
 * The syllabus is drawn as a spine: a rail that fills through the completed
 * lessons and rings the lesson "Continue" will open. That lesson is the
 * server's resume step (`sequence.resumeIndex`), the same answer the player
 * uses, so the page never promises a different place than it delivers.
 *
 * @param {object} props
 * @param {object} props.course          normalized course (normalizeCourseHierarchy)
 * @param {object} [props.progress]      { lessonProgresses: completed lesson ids }
 * @param {object} [props.sequence]      GET /progress/learning-sequence payload
 * @param {boolean} props.hasProgress    any visited/completed item
 * @param {() => void} props.onContinue  opens the player at the resume step
 * @param {(lessonId: string) => void} props.onOpenLesson  opens the player at a lesson
 */
export default function StudentCourseOverview({ course, progress, sequence, hasProgress, onContinue, onOpenLesson }) {
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

  const modules = course.modules || [];
  const lessons = modules.flatMap((m) => m.lessons || []);
  const completedLessonIds = new Set(progress?.lessonProgresses || []);
  // Sequential learning off: every lesson is open and no progress is kept, so
  // the page shows no progress, no "Up next" and no completed lessons.
  const tracksProgress = course.sequentialLearning !== false;

  // Each lesson's state, from the same learning sequence the player walks:
  // its first step (where opening it lands), whether it has any content,
  // whether it is done, and whether the student can open it yet.
  const steps = sequence?.steps || null;
  const lessonState = new Map(
    lessons.map((lesson) => {
      const own = steps ? steps.filter((s) => s.path?.lessonId === lesson.id) : null;
      const hasContent = own ? own.length > 0 : true; // unknown until the sequence loads
      const done =
        tracksProgress &&
        (completedLessonIds.has(lesson.id) || (own != null && own.length > 0 && own.every((s) => s.completed)));
      const locked = own != null && own.length > 0 && own.every((s) => s.locked);
      return [lesson.id, { hasContent, done, locked, canOpen: own != null && own.length > 0 && !locked }];
    })
  );

  // ONE progress measure for the whole page — the bar, "x of y" and every
  // module's x/y all count completed lessons out of the lessons that have
  // content (an empty lesson can never complete, so counting it would pin
  // the bar below 100% forever).
  const countLessons = (list) => {
    const applicable = list.filter((l) => lessonState.get(l.id)?.hasContent);
    return { done: applicable.filter((l) => lessonState.get(l.id)?.done).length, total: applicable.length };
  };
  const courseCount = countLessons(lessons);
  const progressPercent = courseCount.total ? Math.round((courseCount.done / courseCount.total) * 100) : 0;
  const isComplete = courseCount.total > 0 && courseCount.done === courseCount.total;
  const hasNoContent = Array.isArray(steps) && steps.length === 0;
  const actionLabel = hasNoContent
    ? "No content yet"
    : !tracksProgress
      ? "Open course"
      : isComplete
        ? "Review course"
        : hasProgress
          ? "Continue Learning"
          : "Start Learning";

  // Where Continue lands: the resume step and the lesson that holds it.
  const nextStep = sequence?.steps?.[sequence?.resumeIndex] || null;
  const nextLessonId = isComplete || !tracksProgress ? null : nextStep?.path?.lessonId || null;
  const nextLesson = lessons.find((l) => l.id === nextLessonId) || null;
  // Step titles are often generic ("Image", "Video"); the topic says more.
  const nextTopic = nextLesson?.topics?.find((t) => t.id === nextStep?.path?.topicId) || null;

  // Shown at most about half a page wide: a 1280 px copy, not the full upload.
  const courseImage = course.thumbnailUrl ? getDisplayUrl(course.thumbnailUrl, { width: 1280 }) : null;
  const description = course.description || "";
  const isLongDescription = description.length > 320;

  const facts = [
    course.creator?.name && { label: "Instructor", value: course.creator.name },
    course.level && { label: "Level", value: course.level },
    { label: "Modules", value: modules.length },
    { label: "Lessons", value: lessons.length },
    course.estimatedLearningHours && { label: "Est. time", value: `${course.estimatedLearningHours} h` },
  ].filter(Boolean);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-x-10 lg:gap-y-6">
      {/* ── Course identity ─────────────────────────────────────────── */}
      <header className="space-y-4 lg:col-start-1 lg:row-start-1">
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

      {/* ── Action panel (sticky on desktop, right after the title on mobile) ── */}
      <aside className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
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

          <div className="space-y-4 p-5">
            {tracksProgress && (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-foreground">Your progress</span>
                  <span className="font-display text-lg font-bold tabular-nums text-foreground">{progressPercent}%</span>
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Course progress"
                >
                  <div
                    className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-700"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {hasNoContent
                    ? "Your instructor hasn't added any lessons with content yet."
                    : `${courseCount.done} of ${courseCount.total} ${courseCount.total === 1 ? "lesson" : "lessons"} complete`}
                </p>
              </div>
            )}

            {nextLesson && (
              <div className="border-l-2 border-primary pl-3">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">Up next</p>
                <p className="mt-0.5 text-sm font-semibold leading-snug text-foreground">{nextLesson.title}</p>
                {nextTopic?.title && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">Topic: {nextTopic.title}</p>
                )}
              </div>
            )}

            {/* No ?lessonId= — the player lands on the server's resume step. */}
            <button
              type="button"
              onClick={onContinue}
              disabled={hasNoContent}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play size={14} className="shrink-0 fill-current" aria-hidden="true" />
              {actionLabel}
              <ArrowRight
                size={14}
                className="shrink-0 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Syllabus spine ──────────────────────────────────────────── */}
      <section aria-labelledby="syllabus-heading" className="space-y-4 lg:col-start-1 lg:row-start-2">
        <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
          <h2 id="syllabus-heading" className="font-display text-xl font-bold tracking-tight text-foreground">
            Syllabus
          </h2>
          <span className="text-xs text-muted-foreground">
            {modules.length} {modules.length === 1 ? "module" : "modules"} · {lessons.length}{" "}
            {lessons.length === 1 ? "lesson" : "lessons"}
          </span>
        </div>

        {modules.length === 0 ? (
          <p className="text-sm text-muted-foreground">Your instructor hasn&apos;t added any modules yet.</p>
        ) : (
          <ol className="space-y-6">
            {modules.map((mod, modIdx) => {
              const modLessons = mod.lessons || [];
              const modCount = countLessons(modLessons);
              const isModDone = modCount.total > 0 && modCount.done === modCount.total;
              return (
                <li key={mod.id}>
                  <div className="mb-2 flex items-baseline justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
                        Module {modIdx + 1}
                      </p>
                      <h3 className="mt-0.5 font-display text-base font-semibold leading-snug text-foreground">
                        {mod.title}
                      </h3>
                      {mod.description && (
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{mod.description}</p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-xs tabular-nums ${isModDone ? "font-semibold text-success" : "text-muted-foreground"}`}
                    >
                      {modCount.total === 0
                        ? "No content yet"
                        : tracksProgress
                          ? `${modCount.done}/${modCount.total}`
                          : `${modCount.total} ${modCount.total === 1 ? "lesson" : "lessons"}`}
                    </span>
                  </div>

                  {modLessons.length > 0 && (
                    <ol className="relative">
                      {modLessons.map((lesson, i) => {
                        const state = lessonState.get(lesson.id);
                        const done = state.done;
                        const isNext = lesson.id === nextLessonId;
                        const isLast = i === modLessons.length - 1;
                        return (
                          <li key={lesson.id} className="relative flex gap-4 pb-1">
                            {/* the spine: a rail segment below every node but the last;
                                filled once this lesson is complete */}
                            {!isLast && (
                              <span
                                aria-hidden="true"
                                className={`absolute left-[11px] top-7 bottom-0 w-0.5 ${done ? "bg-primary" : "bg-border"}`}
                              />
                            )}
                            <span
                              className={`relative z-10 mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                                done
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : isNext
                                    ? "border-primary bg-background ring-4 ring-primary/15"
                                    : "border-border bg-background"
                              }`}
                            >
                              {done ? (
                                <Check size={13} strokeWidth={3} aria-hidden="true" />
                              ) : isNext ? (
                                <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                              ) : null}
                            </span>
                            <SyllabusLessonRow
                              lesson={lesson}
                              state={state}
                              isNext={isNext}
                              onOpenLesson={onOpenLesson}
                            />
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

/**
 * One syllabus lesson: opens the player at the lesson when the student can
 * open it; otherwise a static row saying why not (locked, or no content yet).
 */
function SyllabusLessonRow({ lesson, state, isNext, onOpenLesson }) {
  const done = state.done;
  const topicCount = lesson.topics?.length || 0;

  const status = done
    ? "Completed"
    : !state.hasContent
      ? "No content yet"
      : state.locked
        ? "Locked — finish the earlier lessons first"
        : topicCount > 0
          ? `${topicCount} ${topicCount === 1 ? "topic" : "topics"}`
          : null;
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={`min-w-0 truncate text-sm ${
              done || !state.canOpen ? "text-muted-foreground" : "font-medium text-foreground"
            }`}
          >
            {lesson.title}
          </span>
          {isNext && (
            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
              Up next
            </span>
          )}
        </span>
        {status && <span className="mt-0.5 block text-xs text-muted-foreground">{status}</span>}
      </span>
      {state.locked ? (
        <Lock size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
      ) : state.canOpen ? (
        <ChevronRight
          size={16}
          className="shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5 group-hover:text-foreground"
          aria-hidden="true"
        />
      ) : null}
    </>
  );
  const rowClass = `flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-1.5 text-left ${
    isNext ? "bg-primary/[0.06]" : ""
  }`;
  return state.canOpen ? (
    <button
      type="button"
      onClick={() => onOpenLesson(lesson.id)}
      aria-label={`Open lesson: ${lesson.title}${done ? " (completed)" : ""}`}
      className={`group ${rowClass} transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer`}
    >
      {body}
    </button>
  ) : (
    <div className={rowClass}>{body}</div>
  );
}
