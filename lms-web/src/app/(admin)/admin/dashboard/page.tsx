"use client";

import { useRouter } from "next/navigation";

export default function AdminDashboardPage() {
  const router = useRouter();

  const handleLogout = () => {
    // Remove token cookie
    document.cookie =
      "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";

    // Remove role cookie
    document.cookie =
      "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";

    // Redirect to login page
    router.push("/login");
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          Admin Dashboard
        </h1>

        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow">
        Admin Dashboard content goes here.
      </div>
    </div>
  );
}