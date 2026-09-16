import { notFound } from "next/navigation";

import { getCourseById } from "@/services/course.service";
import { getCourseReviews } from "@/services/review.service";
import Link from "next/link";
import CourseBuyButton from "@/components/student/course-details/CourseBuyButton";
import CourseAiAssistantIsland from "@/features/ai-assistant/components/CourseAiAssistantIsland";
import { getDisplayUrl } from "@/lib/blob";
import {
  ChevronRight,
  Clock,
  Star,
  User,
  GraduationCap,
  Layers,
  CheckCircle2,
  BarChart2,
  FileText,
  HelpCircle,
  PlayCircle
} from "lucide-react";

export default async function CoursePage({ params }) {
  const { courseId } = await params;

  // getCourseById throws on 404 and on any network/API failure. Without this
  // the whole route 500s with a raw error page — a dead link or a deleted
  // course should be a "not found", not a crash.
  let course;
  try {
    course = await getCourseById(courseId);
  } catch {
    notFound();
  }
  if (!course) notFound();

  // Real reviews for this course. Guarded on its own so a reviews outage
  // degrades to "no reviews yet" instead of taking the whole page down.
  let reviews = [];
  try {
    const fetched = await getCourseReviews(courseId);
    reviews = Array.isArray(fetched) ? fetched : [];
  } catch {
    reviews = [];
  }

  // Dynamic calculations
  const lessonsCount = course.modules?.reduce((acc, m) => acc + (m.lessons?.length ?? 0), 0) ?? 0;
  // Prefer what the instructor actually set; estimate from lesson count only
  // as a second choice. It used to claim a flat "12 hours" for any course with
  // no lessons yet.
  const duration = course.estimatedLearningHours
    ? `${course.estimatedLearningHours} hours`
    : lessonsCount > 0
      ? `${Math.max(1, Math.round((lessonsCount * 25) / 60))} hours`
      : "Not set";
  const worksheetsCount = course.assignments?.length ?? 0;
  const quizzesCount = course.quizzes?.length ?? 0;

  // A course is buyable only with a Store row that is either explicitly free or
  // carries a real price. A missing Store, or price 0 without isFree, means the
  // checkout would fail — so no price is shown and no purchase is offered.
  // Real rating / review figures. stats.avgRating and _count.reviews come back
  // from GET /courses/:id; the page used to print a fixed "4.8 (15 student
  // ratings)" on every course regardless.
  const reviewCount = reviews.length || (course._count?.reviews ?? 0);
  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length
    : Number(course.stats?.avgRating ?? 0);
  const teacher = course.creator?.teacherProfile ?? null;

  const store = course.store;
  const isPurchasable = Boolean(store) && (store.isFree || Number(store.price) > 0);
  const payable = store && store.discountPrice > 0 ? store.discountPrice : store?.price;
  const priceLabel = !isPurchasable
    ? "Pricing unavailable"
    : store.isFree
      ? "Free"
      : `₹${Number(payable).toLocaleString("en-IN")}`;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary">
      <div className="max-w-7xl mx-auto px-6 py-10">
        
        {/* 1. Breadcrumbs Nav */}
        <nav className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
          <Link href="/" className="hover:text-foreground transition">Home</Link>
          <ChevronRight size={10} className="text-muted-foreground" />
          {/* The public catalogue, not /student/courses — that route is behind
              the student guard, so a guest following it was bounced to "/". */}
          <Link href="/courses" className="hover:text-foreground transition">Courses</Link>
          <ChevronRight size={10} className="text-muted-foreground" />
          <span className="text-primary">{course.title}</span>
        </nav>

        {/* 2. Two-Column Dashboard Grid */}
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          
          {/* Left Column: Course Main Content */}
          <div className="space-y-8">
            
            {/* Course Title & Badges block */}
            <div className="space-y-4">
              <h1 className="text-xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                {course.title}
              </h1>
              <p className="text-muted-foreground text-sm font-semibold">
                {course.category}
              </p>

              {/* Horizontal pills stats */}
              <div className="flex flex-wrap gap-2.5 pt-1">
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-transparent bg-background/60 px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-foreground">
                  <Clock size={12} className="text-primary" />
                  <span>{duration}</span>
                </span>
                {reviewCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-transparent bg-background/60 px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-foreground">
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    <span>
                      {avgRating.toFixed(1)} ({reviewCount} student {reviewCount === 1 ? "rating" : "ratings"})
                    </span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-transparent bg-background/60 px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-foreground">
                  <BarChart2 size={12} className="text-purple-400" />
                  <span>{course.level || "Intermediate"} Difficulty</span>
                </span>
              </div>
            </div>

            {/* Course Description Section (Dark full-width card) */}
            <div className="rounded-2xl border border-transparent bg-background/60 p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Course Summary</h3>
              <p className="text-foreground text-sm leading-relaxed">
                {course.description || "This course is designed to strengthen your skills through a series of engaging modules and real-world examples. You'll learn step-by-step and practice with quizzes to master each concept."}
              </p>
            </div>

            {/* Instructor Details Card */}
            <div className="rounded-2xl border border-transparent bg-background/60 p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-14 w-14 overflow-hidden rounded-full border border-transparent bg-slate-850 flex items-center justify-center text-muted-foreground shrink-0">
                  <User size={28} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">{course.creator?.name ?? "Instructor"}</h4>
                  <p className="text-[10px] font-extrabold text-primary uppercase tracking-widest mt-0.5">Lead Syllabus Instructor</p>
                </div>
              </div>
              {teacher?.bio && (
                <p className="text-muted-foreground text-xs leading-relaxed">{teacher.bio}</p>
              )}

              {(teacher?.experience || teacher?.qualification || teacher?.specialization || reviewCount > 0) && (
                <div className="border-t border-transparent/80 my-4" />
              )}

              {/* Only the credentials this instructor has actually filled in on
                  their TeacherProfile. The grid used to hard-code "8+ years",
                  "4.8/5", "M.Tech" and "12K+" for every instructor on the
                  platform. */}
              {(() => {
                const facts = [
                  teacher?.experience ? { label: "Experience", value: `${teacher.experience}+ years` } : null,
                  reviewCount > 0 ? { label: "Rating", value: `${avgRating.toFixed(1)}/5` } : null,
                  teacher?.qualification ? { label: "Education", value: teacher.qualification } : null,
                  teacher?.specialization ? { label: "Specialization", value: teacher.specialization } : null,
                ].filter(Boolean);

                if (facts.length === 0) return null;

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    {facts.map((fact) => (
                      <div key={fact.label}>
                        <p className="text-[8px] font-black uppercase text-muted-foreground tracking-wider">{fact.label}</p>
                        <p className="mt-1 text-xs font-bold text-foreground">{fact.value}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Course Overview Card */}
            <div className="rounded-2xl border border-transparent bg-background/60 p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-5">Course Overview</h3>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-transparent/60 bg-background p-4">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-[9px] font-extrabold uppercase tracking-wide">Modules</span>
                    <Layers size={14} className="text-primary" />
                  </div>
                  <p className="text-xl font-bold text-foreground mt-1">{course.modules?.length ?? 0}</p>
                  <p className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">Total modules</p>
                </div>

                <div className="rounded-xl border border-transparent/60 bg-background p-4">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-[9px] font-extrabold uppercase tracking-wide">Lessons</span>
                    <PlayCircle size={14} className="text-blue-400" />
                  </div>
                  <p className="text-xl font-bold text-foreground mt-1">{lessonsCount}</p>
                  <p className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">Total lessons</p>
                </div>

                <div className="rounded-xl border border-transparent/60 bg-background p-4">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-[9px] font-extrabold uppercase tracking-wide">Students</span>
                    <GraduationCap size={14} className="text-purple-400" />
                  </div>
                  <p className="text-xl font-bold text-foreground mt-1">{course._count?.enrollments ?? course.enrollments?.length ?? 0}</p>
                  <p className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">Enrolled</p>
                </div>

                <div className="rounded-xl border border-transparent/60 bg-background p-4">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-[9px] font-extrabold uppercase tracking-wide">Avg. Rating</span>
                    <Star size={14} className="text-amber-400" />
                  </div>
                  <p className="text-xl font-bold text-foreground mt-1">
                    {reviewCount > 0 ? avgRating.toFixed(1) : "—"}
                    {reviewCount > 0 && <span className="text-xs text-muted-foreground font-medium">/5</span>}
                  </p>
                  <p className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                    {reviewCount > 0 ? `(${reviewCount} ${reviewCount === 1 ? "rating" : "ratings"})` : "No ratings yet"}
                  </p>
                </div>
              </div>
            </div>

            {/* Course Details Grid Card */}
            <div className="rounded-2xl border border-transparent bg-background/60 p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-5">Course Details</h3>
              <div className="grid gap-x-6 gap-y-4 grid-cols-2 sm:grid-cols-3">
                <div>
                  <p className="text-[8px] font-black uppercase text-muted-foreground tracking-wider">Level</p>
                  <p className="text-xs font-bold text-foreground mt-1">{course.level || "Intermediate"}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-muted-foreground tracking-wider">Category</p>
                  <p className="text-xs font-bold text-foreground mt-1">{course.category}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-muted-foreground tracking-wider">Duration</p>
                  <p className="text-xs font-bold text-foreground mt-1">{duration}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-muted-foreground tracking-wider">Language</p>
                  <p className="text-xs font-bold text-foreground mt-1">{course.language || "English"}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-muted-foreground tracking-wider">Lessons</p>
                  <p className="text-xs font-bold text-foreground mt-1">{lessonsCount}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-muted-foreground tracking-wider">Certificate</p>
                  <p className="text-xs font-bold text-foreground mt-1">
                    {course.certificatesEnabled ? "Yes, on completion" : "Not offered"}
                  </p>
                </div>
              </div>
            </div>

            {/* What You'll Learn Checklist Card */}
            {Array.isArray(course.tags) && course.tags.length > 0 && (
              <div className="rounded-2xl border border-transparent bg-background/60 p-6 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-5">What You&apos;ll Learn</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {course.tags.map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <CheckCircle2 size={14} className="text-primary shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Pricing & Cohort Reviews */}
          <div className="space-y-6">
            
            {/* Purchase & Overview Box */}
            <div className="rounded-2xl border border-transparent bg-background/60 p-5 shadow-sm space-y-5">
              
              {/* Media Thumbnail */}
              <div className="h-44 w-full overflow-hidden rounded-xl bg-muted border border-transparent/80 relative flex items-center justify-center">
                {course.thumbnailUrl ? (
                  <img
                    src={getDisplayUrl(course.thumbnailUrl)}
                    alt={course.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <PlayCircle size={48} className="text-muted-foreground" />
                )}
              </div>

              {/* Price Details */}
              <div className="space-y-1">
                <h3 className="text-3xl font-black text-foreground">
                  {priceLabel}
                </h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                  {isPurchasable ? "Full Access Price" : "Not available for purchase yet"}
                </p>
              </div>

              {isPurchasable ? (
                <>
                  <CourseBuyButton courseId={course.id} courseTitle={course.title} />

                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider text-center">
                    Instant access to lessons, quizzes, and live feeds
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground text-center">
                  This course has not been priced yet. Please check back soon.
                </p>
              )}

              <div className="border-t border-transparent/80 pt-4 space-y-2.5 text-xs font-semibold text-muted-foreground">
                <div className="flex justify-between">
                  <span className="flex items-center gap-2"><Clock size={13} className="text-muted-foreground" /> Standard duration</span>
                  <span className="text-foreground">{duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2"><FileText size={13} className="text-muted-foreground" /> Assigned Worksheets</span>
                  <span className="text-foreground">{worksheetsCount} worksheets</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2"><HelpCircle size={13} className="text-muted-foreground" /> Interactive quizzes</span>
                  <span className="text-foreground">{quizzesCount} exams</span>
                </div>
              </div>
            </div>

            {/* Student Reviews Card */}
            <div className="rounded-2xl border border-transparent bg-background/60 p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Student Reviews</h3>
                {reviewCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-400 text-[10px] font-black">
                    <Star size={10} className="fill-amber-400" />
                    <span>{avgRating.toFixed(1)}</span>
                  </span>
                )}
              </div>

              {/* Real reviews from GET /reviews?courseId=. This block used to
                  render three invented testimonials — "John Doe", "Sarah
                  Williams", "Michael Brown" — quoting Next.js, on every course
                  on the platform. */}
              {reviews.length === 0 ? (
                <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                  No reviews yet. Be the first to review this course once you have enrolled.
                </p>
              ) : (
                <div className="space-y-4">
                  {reviews.slice(0, 3).map((rev) => (
                    <div key={rev.id} className="space-y-1.5 text-left border-b border-transparent/40 pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-xs font-bold text-foreground truncate">
                          {rev.student?.user?.name ?? "Student"}
                        </span>
                        <span className="text-[8px] text-muted-foreground font-semibold shrink-0">
                          {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : ""}
                        </span>
                      </div>

                      <div className="flex gap-0.5 text-amber-400">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={10}
                            className={star <= (rev.rating ?? 0) ? "fill-amber-400" : "text-muted-foreground"}
                          />
                        ))}
                      </div>

                      {rev.review && (
                        <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                          &ldquo;{rev.review}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>

          </div>

        </div>

      </div>

      {/* AI Assistant. This page is a Server Component, so the widget is
          mounted through a client island. Guests and signed-in-but-not-enrolled
          visitors both receive course-overview answers only — enforced by the
          backend's scope resolver, not by anything set here. */}
      <CourseAiAssistantIsland courseId={courseId} courseTitle={course.title} />
    </div>
  );
}
