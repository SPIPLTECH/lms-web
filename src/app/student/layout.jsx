"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import DashboardNavbar from "@/components/layouts/DashboardNavbar";
import { useAuth } from "@/context/AuthContext";
import { QaProvider } from "@/context/QaContext";
import Loader from "@/components/common/Loader";
import StudentNavDrawer from "@/components/layouts/StudentNavDrawer";
import { StudentNavDrawerProvider } from "@/context/StudentNavDrawerContext";

export default function Layout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== "STUDENT") {
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

  if (!user || user.role !== "STUDENT") {
    return null; // Let the useEffect redirect
  }

  const isLearnPage = pathname?.includes("/student/learn/");

  if (isLearnPage) {
    // Same top bar as every other Student page, but the learn page still
    // owns its own fixed-viewport, internally-scrolling layout below it
    // (not DashboardLayout's Sidebar/padded <main>/ChatWidget — the learn
    // page already renders its own ChatWidget).
    return (
      <QaProvider>
        <StudentNavDrawerProvider>
          <div className="h-screen flex flex-col overflow-hidden">
            <DashboardNavbar role="STUDENT" title="Learning Workspace" />
            <div className="flex-1 min-h-0">{children}</div>
          </div>
          <StudentNavDrawer />
        </StudentNavDrawerProvider>
      </QaProvider>
    );
  }

  // My Courses fits the viewport from md up: the page itself doesn't scroll,
  // only the Enrolled Courses grid does. Below md the cards are a horizontal
  // slider, so the page keeps its normal document scroll there.
  if (pathname === "/student/my-courses") {
    return (
      <QaProvider>
        <StudentNavDrawerProvider>
          <div className="min-h-screen md:h-screen flex flex-col md:overflow-hidden bg-background">
            <DashboardNavbar role="STUDENT" title="Student Dashboard" />
            <main className="flex-1 min-h-0 w-full max-w-[1728px] mx-auto flex flex-col p-3 sm:p-6">
              {children}
            </main>
          </div>
          <StudentNavDrawer />
        </StudentNavDrawerProvider>
      </QaProvider>
    );
  }

  return (
    <QaProvider>
      <StudentNavDrawerProvider>
        <DashboardLayout role="STUDENT" title="Student Dashboard">
          <div className="max-w-[1600px] mx-auto w-full flex flex-col flex-1 min-h-0">
            {children}
          </div>
        </DashboardLayout>
        <StudentNavDrawer />
      </StudentNavDrawerProvider>
    </QaProvider>
  );
}
