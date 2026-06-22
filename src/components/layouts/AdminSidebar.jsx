"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminSidebar() {
  const pathname =
    usePathname();

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
          name: "Students",
          href: "/admin/students",
        },
        {
          name: "Instructors",
          href: "/admin/instructors",
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

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-3xl font-bold text-orange-500">
          Orange LMS
        </h1>
      </div>

      <nav className="p-4 space-y-2">
        {menuItems.map(
          (item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-3 rounded-lg ${
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
    </aside>
  );
}