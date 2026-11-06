"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import useStudentFeatureAccess from "@/hooks/queries/student/useStudentFeatureAccess";

const TABS = [
  { id: "overview", label: "Overview", href: "/student/reports" },
  { id: "quiz", label: "Quiz", href: "/student/quizzes" },
  { id: "assignment", label: "Assignment", href: "/student/assignments" },
  { id: "certificates", label: "Certificates", href: "/student/certificates" },
];

export default function ReportsTabStrip() {
  const pathname = usePathname();
  const scrollerRef = useRef(null);
  // Assignment and Certificates drop out for an SSC Class 10-only student
  // (lib/studentFeatures.js).
  const { showSubmissions, showCertificates } = useStudentFeatureAccess();
  const tabs = TABS.filter(
    (tab) => (showSubmissions || tab.id !== "assignment") && (showCertificates || tab.id !== "certificates")
  );

  const isTabActive = (tab) =>
    tab.id === "overview" ? pathname === tab.href : pathname?.startsWith(tab.href);

  const scrollBy = (dir) => {
    scrollerRef.current?.scrollBy({ left: dir * 140, behavior: "smooth" });
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        aria-label="Scroll tabs left"
        className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition cursor-pointer"
      >
        <ChevronLeft size={16} />
      </button>

      <div
        ref={scrollerRef}
        className="flex items-center gap-5 overflow-x-auto scrollbar-none scroll-smooth"
      >
        {tabs.map((tab) => {
          const isActive = isTabActive(tab);
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`shrink-0 pb-2 pt-1 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? "text-primary border-primary"
                  : "text-foreground border-transparent hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => scrollBy(1)}
        aria-label="Scroll tabs right"
        className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition cursor-pointer"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
