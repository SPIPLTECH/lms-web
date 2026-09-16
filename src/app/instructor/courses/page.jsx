"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, Search, X, Loader2 } from "lucide-react";

import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import CourseGridCard from "@/components/courses/CourseGridCard";
import { useInstructorCoursesTable } from "@/hooks/queries/instructor/useInstructorCoursesTable";
import InstructorWelcomeCard from "@/components/instructor/InstructorWelcomeCard";

const INITIAL_FILTERS = { search: "", status: "", category: "", level: "", sortBy: "recently_updated", page: 1, limit: 12 };

export default function InstructorCoursesPage() {
  const router = useRouter();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [searchInput, setSearchInput] = useState(filters.search);

  const { data, isLoading, isError, isFetching, refetch } = useInstructorCoursesTable(filters);

  const courses = data?.courses || [];
  const pagination = data?.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 };

  // Debounce search input changes (280ms delay) to avoid triggering API calls on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => {
        if (f.search === searchInput) return f;
        return { ...f, search: searchInput, page: 1 };
      });
    }, 280);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleClearSearch = () => {
    setSearchInput("");
    setFilters((f) => ({ ...f, search: "", page: 1 }));
  };

  const set = (key) => (value) => setFilters((f) => ({ ...f, [key]: value, page: key === "page" ? value : 1 }));

  // Mobile carousel: tracks which card is centered so the pagination dots below
  // can highlight it. Rides the native scroll-snap — no external state drives
  // the scroll position itself, we just observe where it landed.
  const sliderRef = useRef(null);
  const scrollRaf = useRef(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const firstCourseId = courses[0]?.id;

  useEffect(() => {
    sliderRef.current?.scrollTo({ left: 0 });
    setActiveSlide(0);
  }, [firstCourseId]);

  const handleSliderScroll = (e) => {
    const el = e.currentTarget;
    if (scrollRaf.current) return;
    scrollRaf.current = requestAnimationFrame(() => {
      scrollRaf.current = null;
      const center = el.scrollLeft + el.clientWidth / 2;
      let closest = 0;
      let closestDist = Infinity;
      Array.from(el.children).forEach((child, i) => {
        const dist = Math.abs(child.offsetLeft + child.offsetWidth / 2 - center);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      });
      setActiveSlide(closest);
    });
  };

  const goToSlide = (i) => {
    const child = sliderRef.current?.children[i];
    child?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  return (
    <div className="-m-2 sm:-m-6 md:-m-16 p-3 sm:p-6 pt-0 sm:pt-0 space-y-4 md:space-y-6 flex flex-col flex-1 min-h-0">
      <div className="shrink-0">
        <InstructorWelcomeCard />
      </div>

      {isError ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center space-y-3">
          <p className="text-sm font-bold text-foreground">Unable to load courses.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-orange-600 text-foreground text-xs font-bold transition"
          >
            Retry
          </button>
        </div>
      ) : isLoading && !data ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center space-y-3">
          <div className="mx-auto w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-muted-foreground">Loading courses...</p>
        </div>
      ) : courses.length === 0 && pagination.total === 0 && !filters.search && !filters.status && !filters.category && !filters.level ? (
        <EmptyState
          icon={BookOpen}
          title="No Courses Yet"
          description="Start creating your first course."
          actionText="+ Create Course"
          onAction={() => router.push("/instructor/courses/create")}
        />
      ) : (
        <div className="flex flex-col flex-1 min-h-0 rounded-2xl border border-border bg-card px-3 py-4 md:px-12 md:py-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4 mb-4 md:mb-6 shrink-0">
            <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center md:flex-wrap">
              <div className="relative w-full min-w-0 md:max-w-xs">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card !pl-9 !pr-10 py-2 md:py-2.5 text-sm text-foreground placeholder-slate-500 outline-none transition focus:border-primary/60"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-muted-foreground">
                  {isFetching && (
                    <Loader2 size={14} className="animate-spin text-primary shrink-0" />
                  )}
                  {searchInput && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="hover:text-foreground transition p-0.5 rounded-full"
                      title="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <Link
                href="/instructor/courses/import"
                className="inline-flex items-center justify-center rounded-lg bg-muted border border-amber-500/40 px-3 md:px-4 py-2 md:py-2.5 text-xs font-bold text-amber-400 transition hover:bg-muted hover:border-amber-400 whitespace-nowrap"
              >
                <span className="md:hidden">Import</span>
                <span className="hidden md:inline">Import Course</span>
              </Link>
              <button
                onClick={() => router.push("/instructor/courses/create")}
                className="btn-rainbow [--btn-rainbow-fill:var(--primary)] inline-flex items-center justify-center rounded-lg px-3 md:px-5 py-2 md:py-2.5 text-xs font-bold text-primary-foreground transition whitespace-nowrap"
              >
                <span className="md:hidden">+ Create</span>
                <span className="hidden md:inline">+ Create Course</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto md:pr-1 md:-mr-1">
            {/* Mobile: centered peek carousel — the active card snaps to the middle
                of the viewport with a small sliver of its neighbors visible on
                each side (App Store / Apple Music style), one card in focus at a
                time instead of vertical scrolling. Desktop/tablet keep the
                original grid, unchanged, via md:grid overriding the flex display. */}
            <div
              ref={sliderRef}
              onScroll={courses.length > 0 ? handleSliderScroll : undefined}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth [-webkit-overflow-scrolling:touch] scrollbar-none pb-4 md:pb-0 md:grid md:justify-items-center md:mx-auto md:max-w-[1328px] md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4 md:overflow-visible md:snap-none"
            >
              {courses.length === 0 ? (
                <div className="w-full col-span-full">
                  <EmptyState
                    icon={BookOpen}
                    title={filters.search ? `No courses found matching "${filters.search}"` : "No courses match the current filters."}
                    description={filters.search ? "Try searching with different keywords or clear your search query." : undefined}
                    actionText={filters.search ? "Clear Search" : undefined}
                    onAction={filters.search ? handleClearSearch : undefined}
                  />
                </div>
              ) : (
                courses.map((course, index) => (
                  <div key={course.id} className="max-md:contents md:w-full md:max-w-[320px]">
                    <CourseGridCard course={course} index={index} />
                  </div>
                ))
              )}
            </div>

            {!isLoading && courses.length > 1 && (
              <div className="flex md:hidden items-center justify-center gap-1.5 pt-3" role="tablist" aria-label="Course slides">
                {courses.map((course, i) => (
                  <button
                    key={course.id}
                    role="tab"
                    aria-selected={i === activeSlide}
                    aria-label={`Go to ${course.title}`}
                    onClick={() => goToSlide(i)}
                    className={`rounded-full transition-all duration-300 ${
                      i === activeSlide ? "w-2 h-2 bg-primary" : "w-1.5 h-1.5 bg-slate-600"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {!isLoading && courses.length > 0 && (
            <div className="shrink-0 mt-auto">
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={filters.limit}
                onPageChange={set("page")}
                onLimitChange={(limit) => setFilters((f) => ({ ...f, limit, page: 1 }))}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

