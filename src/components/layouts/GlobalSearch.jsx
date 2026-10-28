"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  BookOpen,
  CheckSquare,
  StickyNote,
  Users,
  CornerDownLeft,
} from "lucide-react";

import { getCourses } from "@/services/course.service";
import { getAssignments } from "@/services/assignment.service";
import { getNotes } from "@/services/note.service";
import { getStudents } from "@/services/student.service";
import { QUERY_KEYS } from "@/constants/queryKeys";

const RESULTS_PER_CATEGORY = 4;

// Global Search covers the data each role actually has live list hooks for
// today. Student: Courses, Assignments, Live Classes, Notes. Instructor:
// Courses (own, any status), Students. Lessons/Modules/Quizzes
// don't yet have a flat, filterable list endpoint, so they're intentionally
// left out rather than faked.
export default function GlobalSearch({ role = "student" }) {
  const router = useRouter();
  const isInstructor = role === "instructor";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  const { data: studentCourses = [] } = useQuery({
    queryKey: [QUERY_KEYS.COURSES],
    queryFn: async () => (await getCourses()).filter((c) => c.status === "PUBLISHED"),
    enabled: open && !isInstructor,
    staleTime: 1000 * 60 * 5,
  });
  const { data: assignments = [] } = useQuery({
    queryKey: [QUERY_KEYS.STUDENT_ASSIGNMENTS],
    queryFn: getAssignments,
    enabled: open && !isInstructor,
    staleTime: 1000 * 60 * 5,
  });
  const { data: notes = [] } = useQuery({
    queryKey: [QUERY_KEYS.NOTES, {}],
    queryFn: () => getNotes({}),
    enabled: open && !isInstructor,
    staleTime: 1000 * 60 * 5,
  });

  const { data: instructorCourses = [] } = useQuery({
    queryKey: [QUERY_KEYS.INSTRUCTOR_COURSES],
    queryFn: getCourses,
    enabled: open && isInstructor,
    staleTime: 1000 * 60 * 5,
  });
  const { data: students = [] } = useQuery({
    queryKey: [QUERY_KEYS.ADMIN_STUDENTS || "students"],
    queryFn: getStudents,
    enabled: open && isInstructor,
    staleTime: 1000 * 60 * 5,
  });

  // Cmd/Ctrl+K opens search from anywhere on a student page.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const matches = (...fields) => fields.some((f) => f && String(f).toLowerCase().includes(q));

    if (isInstructor) {
      return [
        {
          id: "courses",
          label: "Courses",
          icon: BookOpen,
          results: instructorCourses
            .filter((c) => matches(c.title, c.category))
            .slice(0, RESULTS_PER_CATEGORY)
            .map((c) => ({ id: c.id, title: c.title, subtitle: c.category || c.status || "Course", href: `/instructor/courses/${c.id}` })),
        },
        {
          id: "students",
          label: "Students",
          icon: Users,
          results: students
            .filter((s) => matches(s.name, s.email))
            .slice(0, RESULTS_PER_CATEGORY)
            .map((s) => ({ id: s.id, title: s.name, subtitle: s.email || "Student", href: "/instructor/students" })),
        },
      ].filter((group) => group.results.length > 0);
    }

    return [
      {
        id: "courses",
        label: "Courses",
        icon: BookOpen,
        results: studentCourses
          .filter((c) => matches(c.title, c.category))
          .slice(0, RESULTS_PER_CATEGORY)
          .map((c) => ({ id: c.id, title: c.title, subtitle: c.category || "Course", href: `/student/courses/${c.id}` })),
      },
      {
        id: "assignments",
        label: "Assignments",
        icon: CheckSquare,
        results: assignments
          .filter((a) => matches(a.title, a.description, a.course?.title || a.courseTitle))
          .slice(0, RESULTS_PER_CATEGORY)
          .map((a) => ({
            id: a.id,
            title: a.title,
            subtitle: a.dueDate ? `Due ${new Date(a.dueDate).toLocaleDateString()}` : "Assignment",
            href: `/student/assignments/${a.id}`,
          })),
      },
      {
        id: "notes",
        label: "Notes",
        icon: StickyNote,
        results: notes
          .filter((n) => matches(n.title, n.content, n.category))
          .slice(0, RESULTS_PER_CATEGORY)
          .map((n) => ({ id: n.id, title: n.title, subtitle: n.category || "Note", href: "/student/notes" })),
      },
    ].filter((group) => group.results.length > 0);
  }, [query, isInstructor, studentCourses, assignments, notes, instructorCourses, students]);

  const flatResults = useMemo(() => groups.flatMap((g) => g.results.map((r) => ({ ...r, group: g.label }))), [groups]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const goTo = (href) => {
    setOpen(false);
    router.push(href);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flatResults[activeIndex];
      if (target) goTo(target.href);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search dashboard (Ctrl+K)"
        // h-9 / min-w-9: the same 36px box as the theme and notification
        // buttons beside it, so the icon-only phone version is not smaller.
        className="flex h-9 min-w-9 items-center justify-center gap-2 rounded-xl border border-border bg-card px-2 sm:px-3.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-border hover:text-foreground"
      >
        <Search size={16} aria-hidden="true" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground lg:inline">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Global search"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/[0.08] bg-popover/95 shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3.5">
              <Search size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isInstructor ? "Search courses and students..." : "Search courses, assignments, notes..."}
                aria-label="Search dashboard"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder-slate-500"
              />
              <kbd className="hidden shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground sm:inline">
                Esc
              </kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-none">
              {!query.trim() ? (
                <p className="px-3 py-10 text-center text-xs text-muted-foreground">
                  {isInstructor
                    ? "Search across your courses and students."
                    : "Search across your courses, assignments, live classes, and notes."}
                </p>
              ) : flatResults.length === 0 ? (
                <p className="px-3 py-10 text-center text-xs text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
              ) : (
                groups.map((group) => {
                  const GroupIcon = group.icon;
                  return (
                    <div key={group.id} className="mb-1.5 last:mb-0">
                      <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{group.label}</p>
                      {group.results.map((r) => {
                        const flatIdx = flatResults.findIndex((f) => f.group === group.label && f.id === r.id);
                        const active = flatIdx === activeIndex;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onMouseEnter={() => setActiveIndex(flatIdx)}
                            onClick={() => goTo(r.href)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                              active ? "bg-primary/10 text-foreground" : "text-foreground hover:bg-white/[0.05]"
                            }`}
                          >
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "bg-primary/15 text-primary" : "bg-white/[0.05] text-muted-foreground"}`}>
                              <GroupIcon size={15} aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-semibold">{r.title}</span>
                              <span className="block truncate text-[11px] text-muted-foreground">{r.subtitle}</span>
                            </span>
                            {active && <CornerDownLeft size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
