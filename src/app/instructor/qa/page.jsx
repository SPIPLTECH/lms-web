"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HelpCircle, Search, Send, Loader2, RotateCcw, FileText, ExternalLink } from "lucide-react";

import MarkdownRenderer from "@/components/ui/MarkdownEditor/MarkdownRenderer";
import { unescapeFromContentApi } from "@/lib/markdown";

import { WorkFilterProvider, useWorkFilters } from "@/context/WorkFilterContext";
import { useInstructorCourses } from "@/hooks/queries/instructor/useInstructorCourses";
import { useModules } from "@/hooks/queries/instructor/useModules";
import { useLessons } from "@/hooks/queries/instructor/useLessons";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import {
  useMyLessonQueries,
  useReplyToLessonQuery,
} from "@/hooks/queries/instructor/useLessonQueries";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "PENDING", label: "Pending" },
  { value: "ANSWERED", label: "Answered" },
];

const STATUS_META = {
  PENDING: { label: "Unanswered", dot: "bg-amber-400", text: "text-amber-400" },
  ANSWERED: { label: "Answered", dot: "bg-emerald-400", text: "text-emerald-400" },
};

const toolbarControlClass =
  "h-9 !bg-card border border-border text-xs !px-3 !py-0 rounded-xl outline-none text-foreground focus:border-primary/60 transition disabled:opacity-40 disabled:cursor-not-allowed [&>option]:bg-card [&>option]:text-foreground";

const timeAgo = (iso) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return diffDays === 1 ? "Yesterday" : `${diffDays}d ago`;
};

/** Compact inline replacement for the old bordered WorkFilterBar panel — same
 * useWorkFilters() context/logic (Course/Batch/Module/Lesson/Status/Date),
 * just laid out as a single wrapping toolbar row instead of a large grid. */
function FilterToolbar({ onResetAll }) {
  const { filters, updateFilter, resetFilters } = useWorkFilters();
  const { data: courses = [] } = useInstructorCourses();
  const { data: modules = [] } = useModules(filters.courseId);
  const { data: lessons = [] } = useLessons(filters.moduleId);

  const handleReset = () => {
    resetFilters();
    onResetAll();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={filters.courseId}
        onChange={(e) => updateFilter("courseId", e.target.value)}
        className={toolbarControlClass}
      >
        <option value="">All Courses</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>{c.title}</option>
        ))}
      </select>

      <select
        value={filters.moduleId}
        onChange={(e) => updateFilter("moduleId", e.target.value)}
        disabled={!filters.courseId}
        className={toolbarControlClass}
      >
        <option value="">All Modules</option>
        {modules.map((m) => (
          <option key={m.id} value={m.id}>{m.title}</option>
        ))}
      </select>

      <select
        value={filters.lessonId}
        onChange={(e) => updateFilter("lessonId", e.target.value)}
        disabled={!filters.moduleId}
        className={toolbarControlClass}
      >
        <option value="">All Lessons</option>
        {lessons.map((l) => (
          <option key={l.id} value={l.id}>{l.title}</option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(e) => updateFilter("status", e.target.value)}
        className={toolbarControlClass}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <DateRangePicker
        startDate={filters.startDate}
        endDate={filters.endDate}
        onChange={(nextStart, nextEnd) => {
          updateFilter("startDate", nextStart);
          updateFilter("endDate", nextEnd);
        }}
        triggerClassName="h-9 py-0"
      />

      <button
        type="button"
        onClick={handleReset}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-muted-foreground transition hover:text-foreground"
      >
        <RotateCcw size={12} />
        Reset
      </button>
    </div>
  );
}

function ReplyBox({ queryId }) {
  const [reply, setReply] = useState("");
  const replyMutation = useReplyToLessonQuery();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    replyMutation.mutate({ queryId, reply: reply.trim() }, { onSuccess: () => setReply("") });
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2.5">
      <input
        type="text"
        placeholder="Write a reply..."
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        className="flex-1 bg-background border border-transparent text-xs px-3 py-2 rounded-lg text-foreground placeholder-slate-500 outline-none focus:border-primary/50"
      />
      <button
        type="submit"
        disabled={replyMutation.isPending || !reply.trim()}
        className="p-2 rounded-lg bg-primary hover:bg-orange-600 disabled:opacity-40 text-slate-950 transition"
      >
        {replyMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
      </button>
    </form>
  );
}

const CONTENT_TYPE_LABELS = {
  VIDEO: "Video",
  HTML: "Reading",
  TEXT: "Reading",
  PDF: "PDF",
  DOCUMENT: "Document",
  FILE: "File",
  PRESENTATION: "Slides",
  SLIDE: "Slides",
  EXTERNAL_LINK: "Link",
  LINK: "Link",
  ASSIGNMENT: "Assignment",
  AUDIO: "Audio",
  CODE: "Code",
};

/**
 * The content the student asked about, right where the instructor answers:
 * text content is shown inline; anything else (video, files) links out to
 * the full content view.
 */
function ContentPreview({ content }) {
  const text = content.htmlContent ? unescapeFromContentApi(content.htmlContent) : "";
  const typeLabel = CONTENT_TYPE_LABELS[content.type] || "Content";

  return (
    <div className="mb-3 overflow-hidden rounded-lg border border-border bg-background/60">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="min-w-0 truncate text-[11px] font-bold text-foreground">
          {content.title || "Course content"}
          <span className="ml-1.5 font-normal text-muted-foreground">{typeLabel}</span>
        </p>
        <Link
          href={`/instructor/contents/view/${content.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-primary transition hover:opacity-80"
        >
          Open content <ExternalLink size={11} aria-hidden />
        </Link>
      </div>
      {text ? (
        <div className="max-h-56 overflow-y-auto px-3 py-2 text-xs">
          <MarkdownRenderer source={text} emptyText="" />
        </div>
      ) : (
        <p className="px-3 py-2 text-[11px] text-muted-foreground">
          {content.type === "VIDEO"
            ? "This is a video. Open it to watch the part the student asked about."
            : "Open the content to see it in full."}
        </p>
      )}
    </div>
  );
}

/** A quiz or assignment the student asked about, with its brief and a link. */
function ItemPreview({ kind, item }) {
  const isQuiz = kind === "quiz";
  const text = isQuiz ? item.description || item.instructions : item.description;
  const typeLabel = isQuiz ? (item.quizTag === "SELF_TEST" ? "Self-test" : "Final quiz") : "Assignment";
  const href = isQuiz ? `/instructor/quizzes/${item.id}` : "/instructor/assignments";

  return (
    <div className="mb-3 overflow-hidden rounded-lg border border-border bg-background/60">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="min-w-0 truncate text-[11px] font-bold text-foreground">
          {item.title || typeLabel}
          <span className="ml-1.5 font-normal text-muted-foreground">{typeLabel}</span>
        </p>
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-primary transition hover:opacity-80"
        >
          Open {isQuiz ? "quiz" : "assignment"} <ExternalLink size={11} aria-hidden />
        </Link>
      </div>
      <p className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words px-3 py-2 text-xs text-muted-foreground">
        {text || `Open the ${isQuiz ? "quiz" : "assignment"} to see it in full.`}
      </p>
    </div>
  );
}

/** What a question was asked about — content block, quiz, assignment, or the lesson. */
function askedAboutLabel(q) {
  if (q.content) return q.content.title || CONTENT_TYPE_LABELS[q.content.type] || "Course content";
  if (q.quiz) return `${q.quiz.title || "Quiz"} (quiz)`;
  if (q.assignment) return `${q.assignment.title || "Assignment"} (assignment)`;
  return null;
}

function QuestionCard({ query: q }) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[q.status] || STATUS_META.PENDING;
  const studentName = q.student?.user?.name || "Student";
  const contextLabel = [q.lesson?.module?.course?.title, q.lesson?.module?.title, q.lesson?.title]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] text-muted-foreground font-semibold truncate min-w-0">{contextLabel}</p>
        <span className="shrink-0 text-[10px] text-muted-foreground font-mono">{timeAgo(q.createdAt)}</span>
      </div>

      <p className={`text-[13px] font-bold text-foreground mt-2 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
        {q.question}
      </p>

      <p className="text-[10.5px] text-muted-foreground mt-2">
        Student: <span className="text-foreground font-semibold">{studentName}</span>
      </p>

      {askedAboutLabel(q) && (
        <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[10.5px] text-muted-foreground">
          <FileText size={12} className="shrink-0" aria-hidden />
          Asked about:
          <span className="truncate font-semibold text-foreground">{askedAboutLabel(q)}</span>
        </p>
      )}

      <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border/60">
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${meta.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[10.5px] font-bold text-primary hover:text-orange-300 transition"
        >
          {expanded ? "Hide question ↑" : "View Question →"}
        </button>
      </div>

      {expanded && (
        <div className="mt-3">
          {q.content && <ContentPreview content={q.content} />}
          {q.quiz && <ItemPreview kind="quiz" item={q.quiz} />}
          {q.assignment && <ItemPreview kind="assignment" item={q.assignment} />}
          {q.reply && (
            <div className="pl-3 border-l-2 border-primary/30">
              <p className="text-[10px] font-black text-primary uppercase tracking-wide">Your reply</p>
              <p className="text-xs text-foreground mt-1">{q.reply}</p>
            </div>
          )}
          {q.status !== "ANSWERED" && <ReplyBox queryId={q.id} />}
        </div>
      )}
    </div>
  );
}

function QAContent() {
  const { appliedFilters } = useWorkFilters();
  const { data: queries = [], isLoading } = useMyLessonQueries(appliedFilters);
  const [search, setSearch] = useState("");

  const filteredQueries = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return queries;
    return queries.filter((q) => {
      const haystack = [
        q.question,
        q.student?.user?.name,
        q.content?.title,
        q.quiz?.title,
        q.assignment?.title,
        q.lesson?.title,
        q.lesson?.module?.title,
        q.lesson?.module?.course?.title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [queries, search]);

  const hasAnyQuestions = queries.length > 0;

  return (
    // Pulls up into DashboardLayout's top padding (p-2 / sm:p-6 / md:p-16) and
    // re-pads it compactly so the search bar sits close under the navbar; the
    // side padding is left alone. The sr-only heading wrapper is sr-only too,
    // so it stays out of flow and doesn't take a space-y-5 gap.
    <div className="-mt-2 sm:-mt-6 md:-mt-16 pt-3 sm:pt-6 space-y-5">
      <div className="sr-only">
        <h1 className="sr-only">Q&amp;A</h1>
        <p className="sr-only">Student doubts raised across every lesson in your courses.</p>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions, students, lessons..."
          className="w-full h-11 bg-card border border-border text-sm !pl-10 !pr-4 rounded-xl outline-none text-foreground placeholder-slate-500 focus:border-primary/60 transition"
        />
      </div>

      <FilterToolbar onResetAll={() => setSearch("")} />

      <div>
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h2 className="text-sm font-black text-foreground tracking-tight">Questions</h2>
          <span className="text-xs font-bold text-muted-foreground">{filteredQueries.length}</span>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse bg-muted/40 rounded-xl" />
              ))}
            </div>
          ) : filteredQueries.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center gap-2">
              <HelpCircle size={20} className="text-slate-600" />
              <p className="text-sm font-bold text-foreground">
                {hasAnyQuestions ? "No questions match your search or filters." : "No questions yet"}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                {hasAnyQuestions
                  ? "Try adjusting or resetting your search and filters."
                  : "Student questions will appear here when they raise doubts from your courses."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQueries.map((q) => (
                <QuestionCard key={q.id} query={q} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QAPage() {
  return (
    <WorkFilterProvider>
      <QAContent />
    </WorkFilterProvider>
  );
}
