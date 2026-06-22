"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";

export default function StudentSidebar() {
  const { logout } = useAuth();

  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="w-64 min-h-screen bg-slate-900 flex flex-col justify-between">
      <div>
        <h1 className="text-4xl font-bold text-orange-500 p-6">
          Orange Tree LMS
        </h1>

        <nav className="space-y-2 px-4">
          <Link
            href="/student/dashboard"
            className="block p-3 rounded hover:bg-slate-800"
          >
            Dashboard
          </Link>

          <Link
            href="/student/courses"
            className="block p-3 rounded hover:bg-slate-800"
          >
            Browse Courses
          </Link>

          <Link
            href="/student/my-courses"
            className="block p-3 rounded hover:bg-slate-800"
          >
            My Courses
          </Link>

          <Link
            href="/student/progress"
            className="block p-3 rounded hover:bg-slate-800"
          >
            Progress
          </Link>
        </nav>
      </div>

      <button
        onClick={handleLogout}
        className="m-4 bg-red-600 py-3 rounded"
      >
        Logout
      </button>
    </div>
  );
}