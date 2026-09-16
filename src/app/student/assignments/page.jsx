"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Inbox, Search, SearchX, X } from "lucide-react";

import PageHeader from "@/components/layouts/PageHeader";
import SubmissionListItem from "@/components/student/submissions/SubmissionListItem";
import useAssignments from "@/hooks/queries/student/useAssignments";
import useQuizSubmissions from "@/hooks/queries/student/useQuizSubmissions";
import {
  SUBMISSION_QUIZ_TYPE_FILTERS,
  SUBMISSION_SORTS,
  SUBMISSION_STATUS_FILTERS,
  SUBMISSION_TYPES,
  buildSubmissionRecords,
  filterAndSortSubmissions,
} from "@/features/student/constants/submissionsConfig";

const SELECT_CLASS =
  "h-11 min-w-0 cursor-pointer rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-primary sm:w-40";

function SubmissionsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading submissions">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-80 max-w-full rounded bg-muted animate-pulse" />
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
        <div className="h-12 w-full max-w-sm rounded-xl bg-muted animate-pulse" />
        <div className="h-11 w-full max-w-lg rounded-xl bg-muted animate-pulse" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
              </div>
            </div>
            <div className="mt-4 h-12 rounded-xl bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The student's Submission Center: every assignment and every attempted
 * quiz across their courses in one list — what they submitted, what they
 * scored, how many attempts they've used and when — with type tabs, search,
 * a status filter and sorting. Quizzes open their result and attempt
 * history; assignments open the submission.
 */
function SubmissionsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Other pages link here scoped to one course (?course=<title>) or one
  // tab (?type=quiz|assignment). Without a tab, the page opens on assignments.
  const courseContext = searchParams.get("course") || "";
  const typeParam = searchParams.get("type");

  const [type, setType] = useState(() =>
    SUBMISSION_TYPES.some((t) => t.key === typeParam) ? typeParam : "assignment"
  );
  const [status, setStatus] = useState("all");
  const [quizType, setQuizType] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");

  const assignmentsQuery = useAssignments();
  const quizzesQuery = useQuizSubmissions();

  const allRecords = useMemo(
    () => buildSubmissionRecords(assignmentsQuery.data ?? [], quizzesQuery.data ?? []),
    [assignmentsQuery.data, quizzesQuery.data]
  );

  // Built from the UNFILTERED records, so choosing a course never removes the
  // other courses from the dropdown. A ?course= value that no longer matches
  // anything is kept as an option, otherwise the select would silently show
  // the wrong course while the list stayed scoped to it.
  const courseOptions = useMemo(() => {
    const titles = new Set(allRecords.map((r) => r.courseTitle).filter(Boolean));
    if (courseContext) titles.add(courseContext);
    return [...titles].sort((a, b) => a.localeCompare(b));
  }, [allRecords, courseContext]);

  const records = useMemo(
    () => (courseContext ? allRecords.filter((r) => r.courseTitle === courseContext) : allRecords),
    [allRecords, courseContext]
  );

  const setCourse = (title) => {
    const next = new URLSearchParams(searchParams.toString());
    if (title) next.set("course", title);
    else next.delete("course");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const typeCounts = useMemo(
    () => ({
      assignment: records.filter((r) => r.type === "assignment").length,
      quiz: records.filter((r) => r.type === "quiz").length,
    }),
    [records]
  );

  const visible = useMemo(
    () => filterAndSortSubmissions(records, { type, status, quizType, query, sort }),
    [records, type, status, quizType, query, sort]
  );

  // Search and status narrow the current tab; switching tabs isn't a filter.
  const filtered = status !== "all" || (type === "quiz" && quizType !== "all") || query.trim() !== "";

  const clearFilters = () => {
    setStatus("all");
    setQuizType("all");
    setQuery("");
  };

  if (assignmentsQuery.isLoading || quizzesQuery.isLoading) return <SubmissionsSkeleton />;

  const failedSources = [
    assignmentsQuery.isError && "assignments",
    quizzesQuery.isError && "quiz results",
  ].filter(Boolean);
  const nothingLoaded = assignmentsQuery.isError && quizzesQuery.isError;

  return (
    <div className="pb-12">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="xl:hidden shrink-0 flex h-11 w-11 items-center justify-center rounded-xl text-foreground hover:bg-muted/60 transition-colors cursor-pointer bg-transparent border-0"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <PageHeader
            title="Submissions"
            subtitle={
              courseContext
                ? `Your assignments and quizzes in ${courseContext} — what you submitted, what you scored, and every attempt.`
                : "Every assignment and quiz across your courses — what you submitted, what you scored, and how many attempts you've used."
            }
          />
        </div>
      </div>

      {nothingLoaded ? (
        <div role="alert" className="rounded-2xl bg-card px-6 py-12 text-center shadow-sm">
          <p className="text-base font-semibold text-foreground">Your submissions couldn&apos;t be loaded</p>
          <p className="mt-1 text-sm text-muted-foreground">Check your connection, then try again.</p>
          <button
            type="button"
            onClick={() => {
              assignmentsQuery.refetch();
              quizzesQuery.refetch();
            }}
            className="mt-5 inline-flex min-h-[44px] cursor-pointer items-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/50"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {/* Type tabs, search, status and sort. */}
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="-mx-1 overflow-x-auto px-1">
              <div
                role="group"
                aria-label="Show"
                className="inline-flex min-w-max rounded-xl border border-border bg-card p-1"
              >
                {SUBMISSION_TYPES.map((t) => {
                  const active = type === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setType(t.key)}
                      className={`inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors ${
                        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.label}
                      <span
                        className={`rounded-full px-1.5 text-[11px] tabular-nums ${
                          active ? "bg-primary-foreground/20" : "bg-muted"
                        }`}
                      >
                        {typeCounts[t.key]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative sm:flex-1 lg:w-72 lg:flex-none">
                <Search
                  size={16}
                  aria-hidden
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search assignments and quizzes"
                  aria-label="Search assignments and quizzes by name"
                  // !pl/!pr: globals.css pads bare inputs from outside any
                  // layer, which would otherwise slide text under the icon.
                  className="h-11 w-full rounded-xl border border-border bg-card !pl-10 !pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                {courseOptions.length > 1 && (
                  <select
                    value={courseContext}
                    onChange={(e) => setCourse(e.target.value)}
                    aria-label="Filter by course"
                    className={SELECT_CLASS}
                  >
                    <option value="">All courses</option>
                    {courseOptions.map((title) => (
                      <option key={title} value={title}>
                        {title}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  aria-label="Filter by status"
                  className={SELECT_CLASS}
                >
                  {SUBMISSION_STATUS_FILTERS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {type === "quiz" && (
                  <select
                    value={quizType}
                    onChange={(e) => setQuizType(e.target.value)}
                    aria-label="Filter by quiz type"
                    className={SELECT_CLASS}
                  >
                    {SUBMISSION_QUIZ_TYPE_FILTERS.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  aria-label="Sort submissions"
                  className={SELECT_CLASS}
                >
                  {SUBMISSION_SORTS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {failedSources.length > 0 && (
            <p
              role="alert"
              className="mb-4 rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning"
            >
              Your {failedSources.join(" and ")} couldn&apos;t be loaded, so they&apos;re missing from this list.
              Refresh the page to try again.
            </p>
          )}

          {typeCounts[type] > 0 && (
            <div className="mb-3 flex min-h-[36px] items-center justify-between gap-3 text-sm text-muted-foreground">
              <p aria-live="polite">
                Showing <span className="font-semibold tabular-nums text-foreground">{visible.length}</span> of{" "}
                <span className="tabular-nums">{typeCounts[type]}</span> {type === "quiz" ? "quizzes" : "assignments"}
              </p>
              {filtered && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex min-h-[36px] cursor-pointer items-center gap-1 rounded-lg px-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  <X size={14} aria-hidden />
                  Clear filters
                </button>
              )}
            </div>
          )}

          {typeCounts[type] === 0 ? (
            <div className="rounded-2xl bg-card px-6 py-14 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Inbox size={22} aria-hidden />
              </div>
              <p className="mt-4 text-base font-semibold text-foreground">
                {type === "quiz" ? "No quizzes submitted yet" : "No assignments submitted yet"}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                {type === "quiz"
                  ? "Quizzes you submit will appear here, with your score and every attempt."
                  : "Assignments you submit will appear here, with your grade and feedback."}
              </p>
              <Link
                href="/student/my-courses"
                className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
              >
                Go to my courses
                <ArrowRight size={15} aria-hidden />
              </Link>
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl bg-card px-6 py-14 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <SearchX size={22} aria-hidden />
              </div>
              <p className="mt-4 text-base font-semibold text-foreground">No matching submissions</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Nothing matches these filters. Try another name or status.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 inline-flex min-h-[44px] cursor-pointer items-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/50"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="space-y-3" aria-label="Submissions">
              {visible.map((record) => (
                <li key={record.key}>
                  <SubmissionListItem record={record} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default function StudentSubmissionsPage() {
  return (
    <Suspense fallback={<SubmissionsSkeleton />}>
      <SubmissionsPageContent />
    </Suspense>
  );
}
