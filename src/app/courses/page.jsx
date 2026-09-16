"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Search, SearchX } from "lucide-react";

import LandingNavbar from "@/components/layouts/LandingNavbar";
import Footer from "@/components/layouts/Footer";
import Eyebrow from "@/components/ui/Eyebrow";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import FeaturedCourseCard from "@/components/courses/FeaturedCourseCard";
import FeaturedCourseCardSkeleton from "@/components/courses/FeaturedCourseCardSkeleton";
import { usePublicCourses } from "@/hooks/queries/usePublicCourses";

const PAGE_SIZE = 12;

/** Only the orderings GET /courses actually implements (its SORT_MAP). */
const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "most_students", label: "Most popular" },
  { value: "alphabetical", label: "Title A-Z" },
];

/**
 * Public course catalogue — every published course, browsable with no account.
 *
 * Deliberately guest-only in what it touches: it reads GET /courses (public,
 * behind optionalToken, published-only for anyone who is not the owning
 * instructor or an admin) and nothing else. No enrollment, progress or other
 * per-student state is requested here, so a signed-out browser renders the
 * whole page without a single 401. Authentication starts one level deeper, on
 * the course detail page's Buy / Continue Learning action.
 *
 * Search, sort and paging are all server-side — the catalogue can outgrow the
 * landing showcase, so the browser never holds more than one page of it.
 */
export default function PublicCoursesPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Typing should not fire a request per keystroke. The query is also
  // cancelled on change through its AbortSignal; this just trims the volume.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  // Any change to what is being asked for restarts at page 1 — otherwise a
  // search run from page 4 lands on an empty page 4 of the new result set.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sortBy, limit]);

  const filters = useMemo(
    () => ({ search: debouncedSearch, sortBy, page, limit }),
    [debouncedSearch, sortBy, page, limit]
  );

  const { data, isLoading, isError, isFetching, refetch } = usePublicCourses(filters);

  const courses = data?.courses ?? [];
  const pagination = data?.pagination ?? { page: 1, limit, total: 0, totalPages: 1 };
  const isSearching = debouncedSearch.length > 0;

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      <LandingNavbar />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <header className="mb-8 sm:mb-10">
          <Eyebrow>Course Catalogue</Eyebrow>
          <h1 className="mt-3 font-display text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
            Every published course.
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Browse the full catalogue — no account needed. Sign in only when you
            are ready to enrol.
          </p>
        </header>

        {/* Toolbar. Search is server-side and matches title, category, tags and
            instructor name, which is why there is no separate category filter:
            the API exposes no list of categories to populate one honestly. */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses..."
              aria-label="Search courses"
              className="w-full rounded-lg border border-transparent bg-muted py-3 pl-9 pr-4 text-sm text-foreground outline-none transition-all hover:border-border-strong focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="course-sort"
              className="whitespace-nowrap text-xs font-semibold text-muted-foreground"
            >
              Sort by
            </label>
            <select
              id="course-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-transparent bg-muted px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary [&>option]:bg-card [&>option]:text-foreground"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <FeaturedCourseCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
            <h2 className="text-sm font-bold text-foreground">Unable to load courses</h2>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              Something went wrong reaching the catalogue. Please try again.
            </p>
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="mt-4 text-xs font-extrabold uppercase tracking-wider !min-h-0 !py-2"
            >
              Retry
            </Button>
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40">
            {isSearching ? (
              <EmptyState
                icon={SearchX}
                title="No courses match your search"
                description={`Nothing published matches "${debouncedSearch}". Try a different title, category or instructor.`}
                actionText="Clear search"
                onAction={() => setSearch("")}
              />
            ) : (
              <EmptyState
                icon={BookOpen}
                title="No courses published yet"
                description="Nothing has been published to the catalogue yet. Check back soon for new learning releases."
              />
            )}
          </div>
        ) : (
          <>
            <div
              aria-busy={isFetching}
              className={`grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 transition-opacity ${
                isFetching ? "opacity-60" : "opacity-100"
              }`}
            >
              {courses.map((course) => (
                <FeaturedCourseCard key={course.id} course={course} />
              ))}
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              Showing {courses.length} of {pagination.total} published course
              {pagination.total === 1 ? "" : "s"}
            </p>

            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          </>
        )}
      </section>

      <Footer />
    </main>
  );
}
