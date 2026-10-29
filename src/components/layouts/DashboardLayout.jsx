"use client";

import DashboardNavbar from "@/components/layouts/DashboardNavbar";

// Students, Instructors, and Admins all navigate via top headers, role nav
// drawers, or on-page widgets — there is no side rail for any role.
// `banner` (optional) renders between the navbar and the page, outside
// <main>: pages bleed into main's padding with negative margins, which would
// slide them over anything placed inside main above them.
export default function DashboardLayout({ children, role, title, banner = null }) {
  return (
    <div className={`flex min-h-screen bg-background`}>
      <div
        className="
          flex-1
          flex
          flex-col
          min-w-0
          transition-all
          duration-300
        "
      >
        <DashboardNavbar title={title} role={role} />

        {banner && (
          <div className="shrink-0 w-full max-w-[1800px] mx-auto px-2 pt-3 sm:px-6 sm:pt-4 md:px-16">{banner}</div>
        )}

        <main className="p-2 sm:p-6 md:p-16 flex-1 w-full max-w-[1800px] mx-auto pb-32">
          {children}
        </main>
      </div>
    </div>
  );
}
