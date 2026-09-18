"use client";

import { ChatWidget } from "@/components/chat";
import DashboardNavbar from "@/components/layouts/DashboardNavbar";

// Students, Instructors, and Admins all navigate via top headers, role nav
// drawers, or on-page widgets — there is no side rail for any role.
export default function DashboardLayout({ children, role, title }) {
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

        <main className="p-2 sm:p-6 md:p-16 flex-1 w-full max-w-[1800px] mx-auto pb-32">
          {children}
        </main>
      </div>
      <ChatWidget />
    </div>
  );
}
