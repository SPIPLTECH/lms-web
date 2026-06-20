"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import useAuth from "@/hooks/useAuth";

export default function AdminLayout({
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
      href: "/admin/dashboard",
    },
    {
      name: "Users",
      href: "/admin/users",
    },
    {
      name: "Courses",
      href: "/admin/courses",
    },
    {
      name: "Analytics",
      href: "/admin/analytics",
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
    <div className="min-h-screen flex bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-3xl font-bold text-orange-500">
            Orange LMS
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
            className="
              w-full
              rounded-lg
              bg-red-600
              px-4
              py-3
              font-semibold
              text-white
              hover:bg-red-700
              transition
            "
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}