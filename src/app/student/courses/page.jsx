"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getCourses } from "@/services/course.service";

export default function StudentCourses() {
  const [courses, setCourses] =
    useState([]);

  useEffect(() => {
    const loadCourses =
      async () => {
        const data =
          await getCourses();

        setCourses(data);
      };

    loadCourses();
  }, []);

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">
        Browse Courses
      </h1>

      <div className="grid md:grid-cols-2 gap-6">
        {courses.map(
          (course) => (
            <div
              key={course.id}
              className="bg-slate-900 p-6 rounded-xl"
            >
              <h2 className="text-2xl font-bold mb-3">
                {course.title}
              </h2>

              <p className="text-slate-400 mb-4">
                {course.description}
              </p>

              <Link
                href={`/student/courses/${course.id}`}
                className="bg-orange-600 px-4 py-2 rounded"
              >
                View Course
              </Link>
            </div>
          )
        )}
      </div>
    </div>
  );
}