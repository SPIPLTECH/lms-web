"use client";

export default function StudentDashboard() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">
        Student Dashboard
      </h1>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 rounded-xl">
          <p className="text-slate-400">
            Enrolled Courses
          </p>

          <h2 className="text-4xl font-bold">
            0
          </h2>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl">
          <p className="text-slate-400">
            Completed Courses
          </p>

          <h2 className="text-4xl font-bold">
            0
          </h2>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl">
          <p className="text-slate-400">
            Progress
          </p>

          <h2 className="text-4xl font-bold">
            0%
          </h2>
        </div>
      </div>
    </div>
  );
}