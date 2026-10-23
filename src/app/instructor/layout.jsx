"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import DashboardNavbar from "@/components/layouts/DashboardNavbar";
import { useAuth } from "@/context/AuthContext";
import Loader from "@/components/common/Loader";
import InstructorNavDrawer from "@/components/layouts/InstructorNavDrawer";
import { InstructorNavDrawerProvider } from "@/context/InstructorNavDrawerContext";

export default function Layout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== "INSTRUCTOR") {
        router.replace("/");
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader />
      </div>
    );
  }

  if (!user || user.role !== "INSTRUCTOR") {
    return null; // Let the useEffect redirect
  }

  // The Course Composer (/instructor/courses/<id>, not /edit or /import) owns
  // one scrollable region — the notebook cell stack — instead of scrolling
  // the whole page. That only works with a bounded-height shell here instead
  // of DashboardLayout's normal p-16/pb-32-padded, ever-growing `main`; same
  // fixed-viewport bypass the Student learn page already uses.
  const segments = pathname?.split("/").filter(Boolean) || [];
  const isCourseComposerPage =
    segments[0] === "instructor" &&
    segments[1] === "courses" &&
    segments.length === 3 &&
    !["edit", "import", "create"].includes(segments[2]);

  // Question upload fits one screen: same bounded shell, so the page itself
  // never scrolls and the back button sits right under the navbar instead of
  // under DashboardLayout's p-16 padding.
  const isQuestionUploadPage = pathname === "/instructor/questions/upload";

  if (isCourseComposerPage || isQuestionUploadPage) {
    return (
      <InstructorNavDrawerProvider>
        <div className="h-screen flex flex-col overflow-hidden">
          <DashboardNavbar
            role="INSTRUCTOR"
            title={isCourseComposerPage ? "Course Composer" : "Instructor Home"}
          />
          <div className="flex-1 min-h-0">{children}</div>
        </div>
        <InstructorNavDrawer />
      </InstructorNavDrawerProvider>
    );
  }

  return (
    <InstructorNavDrawerProvider>
      <DashboardLayout role="INSTRUCTOR" title="Instructor Home">
        <div className="max-w-[1600px] mx-auto w-full flex flex-col flex-1 min-h-0">
          {children}
        </div>
      </DashboardLayout>
      <InstructorNavDrawer />
    </InstructorNavDrawerProvider>
  );
}
