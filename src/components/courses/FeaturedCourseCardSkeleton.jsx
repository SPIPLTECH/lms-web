/**
 * Loading placeholder shaped like FeaturedCourseCard.
 *
 * Extracted from CourseDiscovery, where it was a module-private helper, once
 * the public catalogue at /courses needed the same placeholder. Kept next to
 * the card it stands in for so the two stay in step.
 *
 * ui/Skeleton.jsx covers KPI cards, chart cards, list rows and progress cards
 * — none of them a media-topped course grid card — and common/Loader is a
 * whole-page spinner, which is the wrong granularity for a grid.
 */
export default function FeaturedCourseCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-3.5 space-y-3">
      <div className="aspect-video w-full animate-pulse rounded-xl bg-muted" />
      <div className="space-y-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3.5 w-full animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
