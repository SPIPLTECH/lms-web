"use client";

import { Suspense, useState } from "react";
import { FileText, Edit, Trash2, ArrowLeft, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import Card from "@/components/ui/Card";
import Loader from "@/components/common/Loader";
import AssessmentForm from "@/components/instructor/AssessmentForm";

import { useInstructorCourses } from "@/hooks/queries/instructor/useInstructorCourses";
import FinalTestResultsPanel from "@/components/instructor/assignments/FinalTestResultsPanel";
import GradableRow from "@/components/instructor/assignments/GradableRow";
import { DEFAULT_SORT, SORT_OPTIONS, isSortKey, sortGradables } from "@/lib/gradableSort";
import {
  useInstructorAssignments,
  useInstructorAssignmentContents,
  useUpdateAssignment,
  useDeleteAssignment,
} from "@/hooks/queries/instructor/useAssignments";

// Two views of student work: assignment submissions, and MCQ attempts on
// Final tests (Self-Tests are practice, so they're left out).
const VIEWS = [
  { key: "assignments", label: "Assignment submissions" },
  { key: "final-tests", label: "Final test results" },
];

/** The "N unreviewed" pill, shown only when something is actually waiting. */
const pendingBadges = (pendingCount) =>
  pendingCount > 0
    ? [
        {
          label: `${pendingCount} unreviewed`,
          tone: "border-primary/25 bg-primary/10 text-primary",
        },
      ]
    : [];

function InstructorAssignmentsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Which tab and which course are in the URL, not in state, so that coming
  // back from an item's page lands on the view it was opened from — and so a
  // filtered list can be linked or refreshed without losing its place.
  const viewParam = searchParams.get("view");
  const activeView = VIEWS.some((v) => v.key === viewParam) ? viewParam : "assignments";
  const courseFilter = searchParams.get("course") || "all";
  const sortParam = searchParams.get("sort");
  const sortKey = isSortKey(sortParam) ? sortParam : DEFAULT_SORT;

  const setParams = (updates) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    // replace, not push: switching tabs should not stack up history entries
    // between the instructor and wherever they came from.
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  // Carried into each item's page so its back button can rebuild this exact
  // list, tab and course filter included.
  const listQuery = searchParams.toString();
  const detailHref = (base, id) =>
    `${base}/${id}${listQuery ? `?from=${encodeURIComponent(listQuery)}` : ""}`;

  const [editingAssignment, setEditingAssignment] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: assignments = [], isLoading: loadingAssignments } = useInstructorAssignments();
  // Assignment cells added in the Course Composer are Content rows, not
  // Assignment rows, so they come from their own endpoint.
  const { data: contentAssignments = [], isLoading: loadingContentAssignments } =
    useInstructorAssignmentContents();
  const { data: courses = [], isLoading: loadingCourses } = useInstructorCourses();

  // Filter courses: Owned by instructor and PUBLISHED
  const eligibleCourses = courses.filter(
    (c) => c.creatorId === user?.id && c.status === "PUBLISHED"
  );

  const updateMutation = useUpdateAssignment();
  const deleteMutation = useDeleteAssignment();

  const openEditForm = (assignment) => {
    setEditingAssignment(assignment);
    setErrorMsg("");
  };

  const closeForm = () => {
    setEditingAssignment(null);
  };

  const handleFormSubmit = (payload) => {
    if (!payload.courseId) {
      setErrorMsg("Please select a target course.");
      return;
    }

    updateMutation.mutate(
      { id: editingAssignment.id, payload },
      {
        onSuccess: () => {
          setSuccessMsg("Assignment updated successfully!");
          closeForm();
          setTimeout(() => setSuccessMsg(""), 4000);
        },
        onError: (err) => setErrorMsg(err.response?.data?.message || "Failed to update assignment."),
      }
    );
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this assignment?")) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          setSuccessMsg("Assignment deleted successfully!");
          setTimeout(() => setSuccessMsg(""), 4000);
        },
        onError: (err) => setErrorMsg(err.response?.data?.message || "Failed to delete assignment."),
      });
    }
  };

  if (loadingAssignments || loadingContentAssignments || loadingCourses) return <Loader />;

  // Filter assignments list — draft courses aren't graded yet, so only
  // surface work that belongs to a course the instructor has published.
  const filteredAssignments = sortGradables(
    assignments.filter((a) => {
      if (a.course?.status !== "PUBLISHED") return false;
      if (courseFilter === "all") return true;
      return a.courseId === courseFilter || a.course?.id === courseFilter;
    }),
    sortKey
  );
  const filteredContentAssignments = sortGradables(
    contentAssignments.filter((a) => {
      if (a.course?.status !== "PUBLISHED") return false;
      return courseFilter === "all" || a.course?.id === courseFilter;
    }),
    sortKey
  );

  return (
    <div className="space-y-4 pb-12 animate-fade-in duration-300">
      {/* Toolbar: back, course scope, and the view switch on one line. The
          page title is screen-reader only — the switch already names the
          content, and the rows need the vertical space more. */}
      <h1 className="sr-only">Grading &amp; Results</h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => router.push("/instructor/dashboard")}
          aria-label="Back to dashboard"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted border border-transparent text-foreground hover:border-primary transition"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Scopes both views. */}
          <label htmlFor="course-filter" className="sr-only">
            Filter by course
          </label>
          <select
            id="course-filter"
            value={courseFilter}
            onChange={(e) => setParams({ course: e.target.value === "all" ? null : e.target.value })}
            className="min-h-[38px] rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground outline-none focus:border-primary cursor-pointer"
          >
            <option value="all">All Courses</option>
            {eligibleCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          <label htmlFor="sort-order" className="sr-only">
            Sort order
          </label>
          <select
            id="sort-order"
            value={sortKey}
            onChange={(e) =>
              setParams({ sort: e.target.value === DEFAULT_SORT ? null : e.target.value })
            }
            className="min-h-[38px] rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground outline-none focus:border-primary cursor-pointer"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>

          <div
            role="tablist"
            aria-label="Student work"
            className="inline-flex rounded-xl border border-border bg-card p-1"
          >
            {VIEWS.map((view) => {
              const active = activeView === view.key;
              return (
                <button
                  key={view.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setParams({ view: view.key })}
                  className={`min-h-[30px] rounded-lg px-4 text-xs font-bold transition-colors cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {view.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold p-4 rounded-xl">
          {successMsg}
        </div>
      )}

      {activeView === "final-tests" ? (
        <FinalTestResultsPanel
          courseId={courseFilter === "all" ? undefined : courseFilter}
          listQuery={listQuery}
          sortKey={sortKey}
        />
      ) : filteredAssignments.length === 0 && filteredContentAssignments.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-xs border border-transparent bg-background/60">
          <FileText className="mx-auto text-slate-600 mb-3" size={24} />
          No assignments found. Add an Assignment content cell from within a course&apos;s Composer to
          create one.
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Lesson assignments — Assignment cells from the Course Composer.
              Edited in the Composer itself, so only submissions live here. */}
          {filteredContentAssignments.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                Lesson Assignments
              </h2>
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background/40">
                {filteredContentAssignments.map((a) => (
                <GradableRow
                  key={a.id}
                  href={detailHref("/instructor/content-assignments", a.id)}
                  breadcrumb={a}
                  title={a.title || "Assignment"}
                  gauge={{
                    value: a.submissionsCount,
                    total: a.enrolledCount,
                    label: "submitted",
                  }}
                  badges={pendingBadges(a.pendingSubmissionsCount)}
                />
                ))}
              </div>
            </section>
          )}

          {filteredAssignments.length > 0 && (
            <section className="space-y-2">
              {filteredContentAssignments.length > 0 && (
                <h2 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                  Course Assessments
                </h2>
              )}
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background/40">
                {filteredAssignments.map((a) => (
                <GradableRow
                  key={a.id}
                  href={detailHref("/instructor/assignments", a.id)}
                  breadcrumb={a}
                  title={a.title}
                  gauge={{
                    value: a.submissionsCount,
                    total: a.enrolledCount,
                    label: "submitted",
                  }}
                  badges={pendingBadges(a.pendingSubmissionsCount)}
                  actions={
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditForm(a)}
                        className="rounded-lg p-1.5 text-muted-foreground transition cursor-pointer hover:bg-muted hover:text-foreground"
                        title="Edit Assignment"
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="rounded-lg p-1.5 text-muted-foreground transition cursor-pointer hover:bg-muted hover:text-red-400"
                        title="Delete Assignment"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  }
                />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Modal/Drawer Form Overlay */}
      {editingAssignment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="max-w-2xl w-full border border-transparent bg-background p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeForm}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-6 border-b border-slate-850 pb-3">
              Edit Assignment
            </h3>

            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-transparent px-4 py-2 text-xs font-bold text-foreground hover:text-foreground transition cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <AssessmentForm
              mode="edit"
              initialValues={editingAssignment}
              courses={eligibleCourses}
              loading={updateMutation.isPending}
              submitError={errorMsg}
              onSubmit={handleFormSubmit}
            />
          </Card>
        </div>
      )}
    </div>
  );
}

export default function InstructorAssignmentsPage() {
  // useSearchParams needs a Suspense boundary above it to prerender.
  return (
    <Suspense fallback={<Loader />}>
      <InstructorAssignmentsView />
    </Suspense>
  );
}
