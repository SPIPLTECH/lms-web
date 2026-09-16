"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, Layers, ArrowRight } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/shadcn/avatar";
import { getDisplayUrl } from "@/lib/blob";
import { getPriceInfo, formatPrice } from "@/lib/pricing";

export default function FeaturedCourseCard({ course }) {
  if (!course) return null;

  // Two payload shapes reach this card and both are public:
  //   - GET /public/landing-data, which pre-flattens (instructorName, rating,
  //     reviewsCount, lessonsCount)
  //   - GET /courses, the paginated catalogue, which returns the raw course
  //     row (creator.name, stats.avgRating, _count.reviews, stats.lessonsCount)
  // The flattened names are read first so the landing page is unaffected.
  const sessionsCount =
    course.lessonsCount ??
    course.stats?.lessonsCount ??
    course.modules?.length ??
    course.modulesCount ??
    0;
  const { isPriced, isFree, effectivePrice, listPrice, currency } = getPriceInfo(course.store);
  const ratingValue = course.rating ?? course.stats?.avgRating;
  const rating = ratingValue ? Number(ratingValue) : null;
  const reviewsCount = course.reviewsCount ?? course._count?.reviews ?? 0;
  const instructorName = course.instructorName ?? course.creator?.name ?? null;

  return (
    <Link
      href={`/courses/${course.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xs transition-all duration-300 hover:shadow-md hover:border-primary/40 hover:-translate-y-1 motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* Banner Image (Fixed 16:9 Aspect Ratio) */}
      <div className="relative w-full aspect-video shrink-0 overflow-hidden bg-muted">
        {course.thumbnailUrl ? (
          <Image
            src={getDisplayUrl(course.thumbnailUrl)}
            alt={`${course.title} thumbnail`}
            fill
            unoptimized
            className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/15 to-accent/20">
            <span className="text-4xl" aria-hidden="true">📚</span>
          </div>
        )}

        {course.category && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-background/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary shadow-2xs backdrop-blur-sm">
            {course.category}
          </span>
        )}

        {course.level && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-background/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground shadow-2xs backdrop-blur-sm">
            {course.level}
          </span>
        )}
      </div>

      {/* Content Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-4.5">
        <h3 className="text-sm font-bold leading-snug text-foreground line-clamp-2 group-hover:text-primary transition">
          {course.title}
        </h3>

        {course.description && (
          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
            {course.description}
          </p>
        )}

        {/* text-2xs is not a real token in this project's Tailwind theme, so
            every class below that used it was silently inheriting the 16px
            body size. Replaced with explicit sizes. */}
        <div className="mt-3 flex items-center gap-3 text-[11px] font-semibold text-muted-foreground">
          {rating !== null && (
            <span className="flex items-center gap-1">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
              {reviewsCount ? ` (${reviewsCount})` : ""}
            </span>
          )}
          {sessionsCount > 0 && (
            <span className="flex items-center gap-1">
              <Layers size={12} />
              {sessionsCount} lessons
            </span>
          )}
        </div>

        {instructorName && (
          <div className="mt-3 flex items-center gap-2">
            <Avatar className="size-5 shrink-0">
              <AvatarFallback className="text-[9px] font-bold">
                {instructorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-[11px] font-medium text-muted-foreground">
              {instructorName}
            </span>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
            {/* A course with no Store row is unpriced, not free — saying
                "Free" here contradicted the detail page this card links to,
                which refuses to sell it. */}
            <span
              className={
                isPriced
                  ? "text-sm font-bold leading-tight text-foreground"
                  : "text-[11px] font-semibold leading-tight text-muted-foreground"
              }
            >
              {!isPriced
                ? "Pricing unavailable"
                : isFree
                  ? "Free"
                  : formatPrice(effectivePrice, currency)}
            </span>
            {isPriced && listPrice && (
              <span className="text-[11px] text-muted-foreground line-through">
                {formatPrice(listPrice, currency)}
              </span>
            )}
          </div>

          {/* shrink-0 + whitespace-nowrap keep this a single-line pill: in a
              4-column grid the price beside it used to squeeze "View Course"
              onto two lines. */}
          <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
            View Course
            <ArrowRight size={11} className="transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
