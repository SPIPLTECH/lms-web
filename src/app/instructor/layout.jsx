"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";

export default function InstructorLayout({
  children,
}) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const { logout } =
    useAuth();

  const menuItems = [
    {
      name: "Dashboard",
      href:
        "/instructor/dashboard",
    },
    {
      name: "My Courses",
      href:
        "/instructor/courses",
    },
  ];

  const handleLogout =
    () => {
      logout();

      router.push(
        "/login"
      );
    };

  return (
    <div className="flex min-h-screen bg-slate-950">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-3xl font-bold text-orange-500">
            Instructor
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map(
            (item) => (
              <Link
                key={
                  item.href
                }
                href={
                  item.href
                }
                className={`block px-4 py-3 rounded-lg transition ${
                  pathname ===
                  item.href
                    ? "bg-orange-600 text-white"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                {item.name}
              </Link>
            )
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={
              handleLogout
            }
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}