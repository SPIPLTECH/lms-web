"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Award,
  MessageSquareQuote,
  ArrowLeft,
  BookOpen,
  Sparkles,
  Layers,
  ExternalLink,
} from "lucide-react";

import Loader from "@/components/common/Loader";
import Card from "@/components/ui/Card";
import { useInstructorCourse } from "@/hooks/queries/instructor/useInstructorCourse";
import useInstructorCourseKey from "@/hooks/queries/instructor/useInstructorCourseKey";
import { useUpdateCourse } from "@/hooks/queries/instructor/useUpdateCourse";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import CertificateSettingsView from "@/components/instructor/courses/CertificateSettingsView";
import CourseFeedbackView from "@/components/instructor/courses/CourseFeedbackView";

export default function CourseCertificatesAndFeedbackPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const rawKey = params?.courseId;
  const {
    courseId,
    isResolving: courseKeyResolving,
    notFound: courseKeyNotFound,
  } = useInstructorCourseKey(rawKey);

  const initialTab = searchParams?.get("tab") === "feedback" ? "feedback" : "certificates";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Fetch course details
  const {
    data: course,
    isLoading: courseLoading,
    isError: courseError,
  } = useInstructorCourse(courseId, { shallow: true });

  const updateCourseMutation = useUpdateCourse();

  // Keep URL canonical if urlKey is present
  useEffect(() => {
    if (typeof window === "undefined" || !course?.urlKey) return;
    const expectedPath = `/instructor/courses/${encodeURIComponent(course.urlKey)}/certificates`;
    if (window.location.pathname !== expectedPath) {
      window.history.replaceState(null, "", `${expectedPath}${window.location.search}`);
    }
  }, [course?.urlKey]);

  // Handle saving certificate settings to backend
  const handleSaveCertificateSettings = async (settingsData) => {
    try {
      await updateCourseMutation.mutateAsync({
        courseId,
        courseData: settingsData,
      });
      showToast("Certificate template & honor memo saved successfully!", "success", "Saved");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to save certificate template settings";
      showToast(msg, "error");
    }
  };

  if (courseKeyResolving || courseLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader />
        <p className="text-sm font-semibold text-muted-foreground animate-pulse">
          Loading course certificates & feedback…
        </p>
      </div>
    );
  }

  if (courseKeyNotFound || courseError || !course) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <Card>
          <div className="py-12 px-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
              <Award size={28} />
            </div>
            <h2 className="text-xl font-black text-foreground">Course Not Found</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              We couldn't locate the course you're looking for. It may have been deleted or moved.
            </p>
            <div className="pt-2">
              <Link
                href="/instructor/courses"
                className="btn inline-flex items-center gap-2 rounded-xl bg-primary text-slate-950 font-black text-sm px-4 py-2 hover:bg-orange-600 transition"
              >
                <ArrowLeft size={16} />
                Back to All Courses
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const courseTitle = course.title || "Untitled Course";
  const courseBackUrl = `/instructor/courses/${encodeURIComponent(course.urlKey || courseId)}`;
  const status = course.status || "DRAFT";
  const isPublished = status === "PUBLISHED";

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-6 py-2 sm:py-2.5 space-y-2 sm:space-y-2.5 h-full flex flex-col overflow-hidden">
      {/* Sleek Top Studio Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border/80 pb-2 sm:pb-2.5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={courseBackUrl}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition group px-2.5 py-1.5 rounded-xl border border-border bg-background hover:bg-muted shrink-0"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Course Composer</span>
          </Link>
          
          <span className="text-muted-foreground/30 shrink-0">•</span>

          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm sm:text-base font-black text-foreground truncate max-w-sm sm:max-w-md">
              {courseTitle}
            </h1>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border shrink-0 ${
                isPublished
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
            >
              {status}
            </span>
          </div>
        </div>

        {/* Studio Sub-Tabs & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-background border border-border p-1 rounded-xl shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab("certificates")}
              className={`btn inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === "certificates"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Award size={14} />
              <span>Certificate Studio</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("feedback")}
              className={`btn inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === "feedback"
                  ? "bg-primary text-slate-950 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <MessageSquareQuote size={14} />
              <span>Student Feedback</span>
            </button>
          </div>

          <Link
            href={courseBackUrl}
            className="btn inline-flex items-center gap-1.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-bold px-3 py-1.5 transition hidden sm:inline-flex"
          >
            <BookOpen size={13} />
            <span>Edit Syllabus</span>
          </Link>
        </div>
      </div>

      {/* Main Tab Content: fills remaining viewport height with ZERO page scroll */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "certificates" && (
          <div className="h-full animate-in fade-in duration-200">
            <CertificateSettingsView
              course={course}
              onSave={handleSaveCertificateSettings}
              isSaving={updateCourseMutation.isPending}
              role={user?.role || "INSTRUCTOR"}
            />
          </div>
        )}

        {activeTab === "feedback" && (
          <div className="h-full overflow-y-auto animate-in fade-in duration-200">
            <CourseFeedbackView courseId={courseId} />
          </div>
        )}
      </div>
    </div>
  );
}
