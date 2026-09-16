"use client";

/**
 * Where a gradable item lives: Course / Module / Lesson / Topic.
 *
 * An item attaches at exactly one of those four levels, so the segments above
 * it resolve and the ones below are absent — this renders whatever came back
 * rather than padding out empty crumbs. Shared by the list rows and by the
 * detail page each row opens, so the two always read identically.
 */
export default function GradableBreadcrumb({ item, size = "sm" }) {
  const crumbs = [
    item?.course?.title,
    item?.moduleTitle,
    item?.lessonTitle,
    item?.topicTitle,
  ].filter(Boolean);

  if (crumbs.length === 0) {
    return <span className="text-[11px] font-bold text-muted-foreground">Unassigned</span>;
  }

  return (
    <span
      className={`flex min-w-0 flex-wrap items-center gap-1 font-bold text-foreground ${
        size === "lg" ? "text-xs" : "text-[11px]"
      }`}
    >
      {crumbs.map((crumb, i) => (
        <span key={`${crumb}-${i}`} className="flex items-center gap-1">
          {i > 0 && <span className="text-muted-foreground/50">/</span>}
          {/* The course reads as the root, so it is the one that gets colour. */}
          <span className={i === 0 ? "text-primary" : ""}>{crumb}</span>
        </span>
      ))}
    </span>
  );
}
