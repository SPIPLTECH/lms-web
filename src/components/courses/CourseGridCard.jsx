"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { BookOpen, Clock, Users, Pencil, ArrowRight } from "lucide-react";

import ActionMenu from "@/components/menus/ActionMenu";
import { useConfirm, useAlert } from "@/context/ConfirmContext";
import { useDeleteCourse } from "@/hooks/queries/instructor/useDeleteCourse";
import { getDisplayUrl } from "@/lib/blob";
import { useToast } from "@/components/ui/ToastProvider";

const STATUS_STYLE = {
  PUBLISHED: { label: "Published", dot: "bg-emerald-400" },
  DRAFT: { label: "Draft", dot: "bg-amber-400" },
  ARCHIVED: { label: "Archived", dot: "bg-rose-400" },
};

const LEVEL_STYLE = {
  Beginner: "bg-primary/10 text-primary border-primary/20",
  Intermediate: "bg-primary/15 text-primary border-primary/30",
  Advanced: "bg-primary/20 text-primary border-primary/40",
};

/** My Courses grid card — banner, meta row, tag pills, edit/view actions, and a
 *  kebab menu for delete. */
export default function CourseGridCard({ course }) {
  const router = useRouter();
  const confirm = useConfirm();
  const showAlert = useAlert();
  const { showToast } = useToast();

  const deleteCourseMutation = useDeleteCourse();

  const statusStyle = STATUS_STYLE[course.status] || STATUS_STYLE.DRAFT;
  const studentsCount = course._count?.enrollments ?? 0;

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Delete Course",
      message: `Are you sure you want to delete "${course.title}"? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!confirmed) return;
    try {
      await deleteCourseMutation.mutateAsync(course.id);
      showToast("Course deleted successfully", "success");
    } catch (err) {
      console.error("Delete failed:", err);
      const errRes = err?.response?.data;
      if (errRes?.code === "COURSE_HAS_STUDENT_DATA" || errRes?.hasStudentData) {
        await showAlert({
          title: "Course Cannot Be Deleted",
          message: `"${course.title}" contains student or historical data (enrollments, progress, quiz submissions, or certificates). Archive it instead from the course page to preserve that data.`,
          confirmText: "Understood",
        });
      } else {
        showToast(errRes?.message || err?.message || "Failed to delete course", "error");
      }
    }
  };

  const menuItems = [
    { label: "Delete Course", onClick: handleDelete },
  ];

  return (
    <div
      onClick={() => router.push(`/instructor/courses/${course.id}`)}
      className="bg-card group relative flex w-[85%] shrink-0 snap-center max-md:first:ml-[5%] max-md:last:mr-[5%] md:w-full md:shrink-0 flex-col overflow-hidden rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
    >
      {/* Flush image wrapper — 16:9 so the banner scales with the card's
          width instead of a fixed pixel height that looked squat once cards
          widened to 4-per-row. */}
      <div className="relative aspect-video shrink-0 w-full overflow-hidden bg-muted">
        {course.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getDisplayUrl(course.thumbnailUrl)}
            alt={course.title || "Course thumbnail"}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center">
            <BookOpen size={28} className="text-muted-foreground/30" />
          </div>
        )}

        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-[10px] font-bold text-foreground shadow-sm">
            <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
            {statusStyle.label}
          </span>
        </div>

        <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
          <div className="bg-background rounded-full shadow-sm text-foreground">
            <ActionMenu items={menuItems} />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-[15px] font-semibold leading-tight line-clamp-1 text-foreground mb-1.5">
          {course.title}
        </h3>

        <p className="text-[12px] leading-snug text-muted-foreground line-clamp-2 min-h-[2.25rem] mb-3">
          {course.description || "No description provided."}
        </p>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Users size={12} className="text-muted-foreground/70" />
            {studentsCount} {studentsCount === 1 ? "Student" : "Students"}
          </span>
          <span className="text-muted-foreground/40 text-[10px]">●</span>
          <span className="flex items-center gap-1">
            <BookOpen size={12} className="text-muted-foreground/70" />
            {course.stats?.lessonsCount ?? course._count?.lessons ?? 0} Lessons
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="rounded-full bg-primary/10 px-2 py-[3px] text-[10px] font-bold text-primary">
            {course.level || "Beginner"}
          </span>
        </div>

        <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
          <Link
            href={`/instructor/courses/edit/${course.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex min-h-11 items-center gap-1.5 text-[11px] font-medium text-link hover:text-link-hover hover:underline transition"
          >
            <Pencil size={11} />
            Edit
          </Link>
          <Link
            href={`/instructor/courses/${course.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex min-h-11 items-center gap-1 text-[11px] font-semibold text-link hover:text-link-hover hover:underline transition"
          >
            View Course
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
