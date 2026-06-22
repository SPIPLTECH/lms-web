"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  getMyEnrollments,
} from "@/services/enrollment.service";

import {
  getProgress,
} from "@/services/progress.service";

export default function StudentDashboard() {
  const [stats, setStats] =
    useState({
      enrolled: 0,
      completed: 0,
      progress: 0,
    });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard =
    async () => {
      try {
        const user =
          JSON.parse(
            localStorage.getItem(
              "user"
            )
          );

        const enrollmentResponse =
          await getMyEnrollments(
            user.id
          );

        const enrollments =
          enrollmentResponse.data;

        let completed = 0;
        let totalLessons = 0;

        for (const enrollment of enrollments) {
          const progressResponse =
            await getProgress(
              enrollment.courseId
            );

          completed +=
            progressResponse.data
              .completedLessons;

          totalLessons +=
            progressResponse.data
              .totalLessons;
        }

        const percentage =
          totalLessons > 0
            ? Math.round(
                (completed /
                  totalLessons) *
                  100
              )
            : 0;

        setStats({
          enrolled:
            enrollments.length,
          completed,
          progress:
            percentage,
        });
      } catch (error) {
        console.error(error);
      }
    };

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

          <h2 className="text-4xl font-bold text-orange-500">
            {stats.enrolled}
          </h2>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl">
          <p className="text-slate-400">
            Completed Lessons
          </p>

          <h2 className="text-4xl font-bold text-green-500">
            {stats.completed}
          </h2>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl">
          <p className="text-slate-400">
            Progress
          </p>

          <h2 className="text-4xl font-bold text-blue-500">
            {stats.progress}%
          </h2>
        </div>
      </div>
    </div>
  );
}