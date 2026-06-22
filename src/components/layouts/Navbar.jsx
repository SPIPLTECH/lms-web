"use client";

import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";

export default function Navbar() {
  const { logout } =
    useAuth();

  const router =
    useRouter();

  const handleLogout =
    () => {
      logout();

      router.push(
        "/login"
      );
    };

  return (
    <header className="bg-slate-900 border-b border-slate-800 p-4 flex justify-end">
      <button
        onClick={handleLogout}
        className="
          bg-red-600
          hover:bg-red-700
          px-5
          py-2
          rounded-lg
          text-white
        "
      >
        Logout
      </button>
    </header>
  );
}