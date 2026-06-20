"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import useAuth from "@/hooks/useAuth";

export default function Dashboard() {
const router = useRouter();

const {
user,
loading,
logout,
} = useAuth();

useEffect(() => {
if (!loading && !user) {
router.push("/login");
}
}, [user, loading, router]);

if (loading) {
return ( <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
Loading... </div>
);
}

return ( <div className="min-h-screen bg-slate-950 text-white"> <header className="border-b border-slate-800 bg-slate-900"> <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center"> <h1 className="text-2xl font-bold text-orange-500">
Orange LMS </h1>
      <button
        onClick={() => {
          logout();
          router.push("/login");
        }}
        className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"
      >
        Logout
      </button>
    </div>
  </header>

  <main className="max-w-7xl mx-auto p-6">
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
      <h2 className="text-3xl font-bold">
        Welcome, {user?.name}
      </h2>

      <p className="text-slate-400 mt-2">
        Role: {user?.role}
      </p>
    </div>

    <div className="grid md:grid-cols-3 gap-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold">
          Courses
        </h3>

        <p className="text-4xl font-bold mt-4">
          0
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold">
          Progress
        </h3>

        <p className="text-4xl font-bold mt-4">
          0%
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold">
          Certificates
        </h3>

        <p className="text-4xl font-bold mt-4">
          0
        </p>
      </div>
    </div>
  </main>
</div>


);
}
