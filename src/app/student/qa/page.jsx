"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HelpCircle, Search, Plus, BookOpen, LayoutGrid } from "lucide-react";
import PageHeader from "@/components/layouts/PageHeader";
import { useQa } from "@/context/QaContext";
import { STATUS_FILTERS } from "@/features/student/constants/qaConfig";
import AskQuestionModal from "@/components/student/qa/AskQuestionModal";
import ThreadCard from "@/components/student/qa/ThreadCard";

export default function QaPage() {
  const { threads, enrolledCourses, askQuestion, isLoading, isAsking, askError } = useQa();

  const [activeCourseId, setActiveCourseId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [expandedId, setExpandedId] = useState(null);
  const [showAskModal, setShowAskModal] = useState(false);

  // Per-course counters for the course chip row.
  const courseStats = useMemo(() => {
    const stats = new Map();
    for (const t of threads) {
      const courseId = t.lesson?.module?.course?.id;
      if (!courseId) continue;
      const entry = stats.get(courseId) || { total: 0, unanswered: 0 };
      entry.total += 1;
      if (t.status !== "ANSWERED") entry.unanswered += 1;
      stats.set(courseId, entry);
    }
    return stats;
  }, [threads]);

  // If the previously active course is no longer enrolled, fall back to "all".
  useEffect(() => {
    if (activeCourseId === "all") return;
    if (!enrolledCourses.some((c) => c.courseId === activeCourseId)) {
      setActiveCourseId("all");
    }
  }, [enrolledCourses, activeCourseId]);

  const filteredThreads = useMemo(() => {
    return threads
      .filter((t) => {
        const q = searchQuery.trim().toLowerCase();
        const haystack = [t.question, t.lesson?.title, t.lesson?.module?.title, t.lesson?.module?.course?.title]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchesSearch = !q || haystack.includes(q);
        const matchesCourse = activeCourseId === "all" || t.lesson?.module?.course?.id === activeCourseId;
        const answered = t.status === "ANSWERED";
        const matchesStatus =
          statusFilter === "All" || (statusFilter === "Answered" ? answered : !answered);
        return matchesSearch && matchesCourse && matchesStatus;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [threads, searchQuery, activeCourseId, statusFilter]);

  const handleAsk = async ({ lessonId, question }) => {
    try {
      const id = await askQuestion({ lessonId, question });
      setShowAskModal(false);
      setExpandedId(id);
    } catch {
      // askError (from context) is already surfaced inside the modal; keep it open.
    }
  };

  if (enrolledCourses.length === 0) {
    return (
      <div className="space-y-6 text-foreground">
        <PageHeader
          title="Q&A"
          subtitle="Ask questions about your courses and get answers from instructors and classmates."
        />
        <div className="rounded-2xl border border-transparent/80 bg-background/50 p-6 py-20 text-center text-muted-foreground">
          <BookOpen size={40} className="mx-auto mb-3 text-slate-600 opacity-40" />
          <p className="text-sm font-semibold text-foreground">No enrolled courses yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Q&amp;A is organized by course — enroll in a course to start asking questions.</p>
          <Link
            href="/student/my-courses"
            className="mt-4 inline-block cursor-pointer rounded-xl bg-primary px-4 py-2 text-xs font-bold text-foreground transition hover:bg-orange-650"
          >
            Go to My Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-foreground">
      <PageHeader
        title="Q&A"
        subtitle="Ask questions about your courses and get answers from instructors and classmates."
      >
        <button
          onClick={() => setShowAskModal(true)}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-foreground shadow-md transition hover:bg-orange-600"
        >
          <Plus size={15} /> Ask a Question
        </button>
      </PageHeader>

      {/* Course-wise selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveCourseId("all")}
          className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
            activeCourseId === "all"
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-transparent/80 bg-background/50 text-muted-foreground hover:border-transparent hover:text-foreground"
          }`}
        >
          <LayoutGrid size={14} />
          All Courses
          <span className="rounded-full bg-muted/80 px-1.5 py-0.5 text-[10px] font-black text-foreground">{threads.length}</span>
        </button>

        {enrolledCourses.map((c) => {
          const stats = courseStats.get(c.courseId) || { total: 0, unanswered: 0 };
          const active = activeCourseId === c.courseId;
          return (
            <button
              key={c.courseId}
              onClick={() => setActiveCourseId(c.courseId)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-transparent/80 bg-background/50 text-muted-foreground hover:border-transparent hover:text-foreground"
              }`}
            >
              <BookOpen size={14} />
              <span className="max-w-[160px] truncate">{c.title}</span>
              <span className="rounded-full bg-muted/80 px-1.5 py-0.5 text-[10px] font-black text-foreground">{stats.total}</span>
              {stats.unanswered > 0 && (
                <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-black text-amber-400">
                  {stats.unanswered} pending
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-transparent/80 bg-background/50 py-2 !pl-9 !pr-4 text-xs text-foreground outline-none transition focus:border-primary"
          />
        </div>

        <div className="flex gap-1 rounded-xl border border-transparent/80 bg-background/50 p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-[10.5px] font-black transition ${
                statusFilter === f ? "bg-primary text-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Thread list */}
      {isLoading ? (
        <div className="space-y-3.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-background/50" />
          ))}
        </div>
      ) : filteredThreads.length === 0 ? (
        <div className="rounded-2xl border border-transparent/80 bg-background/50 p-6 py-20 text-center text-muted-foreground">
          <HelpCircle size={40} className="mx-auto mb-3 text-slate-600 opacity-40" />
          <p className="text-sm font-semibold text-foreground">No questions found</p>
          <p className="mt-1 text-xs text-muted-foreground">Be the first to ask something about this course.</p>
          <button
            onClick={() => setShowAskModal(true)}
            className="mt-4 cursor-pointer rounded-xl bg-primary px-4 py-2 text-xs font-bold text-foreground transition hover:bg-orange-650"
          >
            Ask a Question
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredThreads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              expanded={expandedId === thread.id}
              onToggle={(id) => setExpandedId((cur) => (cur === id ? null : id))}
            />
          ))}
        </div>
      )}

      {showAskModal && (
        <AskQuestionModal
          enrolledCourses={enrolledCourses}
          defaultCourseId={activeCourseId !== "all" ? activeCourseId : undefined}
          onClose={() => setShowAskModal(false)}
          onSubmit={handleAsk}
          isSubmitting={isAsking}
          error={askError}
        />
      )}
    </div>
  );
}
