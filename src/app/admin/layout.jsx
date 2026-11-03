"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import DashboardNavbar from "@/components/layouts/DashboardNavbar";
import { useAuth } from "@/context/AuthContext";
import Loader from "@/components/common/Loader";
import AdminNavDrawer from "@/components/layouts/AdminNavDrawer";
import { AdminNavDrawerProvider } from "@/context/AdminNavDrawerContext";

export default function Layout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== "ADMIN") {
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

  if (!user || user.role !== "ADMIN") {
    return null; // Let the useEffect redirect
  }

  // A proctored attempt's review fits a laptop screen, the same bounded shell
  // the instructor layout gives it; below lg it is an ordinary page, scrolled here.
  const segments = pathname?.split("/").filter(Boolean) || [];
  if (segments[0] === "admin" && segments[1] === "proctoring" && segments.length === 3) {
    return (
      <AdminNavDrawerProvider>
        <div className="h-screen flex flex-col overflow-hidden">
          <DashboardNavbar role="ADMIN" title="Admin Dashboard" />
          <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">{children}</div>
        </div>
        <AdminNavDrawer />
      </AdminNavDrawerProvider>
    );
  }

  return (
    <AdminNavDrawerProvider>
      <DashboardLayout role="ADMIN" title="Admin Dashboard">
        <div className="max-w-[1600px] mx-auto w-full flex flex-col flex-1 min-h-0">
          {children}
        </div>
      </DashboardLayout>
      <AdminNavDrawer />
    </AdminNavDrawerProvider>
  );
}
