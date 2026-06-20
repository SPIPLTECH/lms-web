    "use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  getCourses,
} from "@/services/course.service";

export default function InstructorCourses() {
  const [courses, setCourses] =
    useState([]);

  useEffect(() => {
    const loadCourses =
      async () => {
        try {
          const response =
            await getCourses();

          setCourses(
            response
          );
        } catch (error) {
          console.error(
            error
          );
        }
      };

    loadCourses();
  }, []);

  return (
    <div>
      <h1 className="text-4xl font-bold text-white mb-8">
        My Courses
      </h1>

      <div className="bg-slate-900 rounded-xl overflow-hidden">
        <table className="w-full text-white">
          <thead className="bg-slate-800">
            <tr>
              <th className="p-4 text-left">
                Title
              </th>

              <th className="p-4 text-left">
                Category
              </th>

              <th className="p-4 text-left">
                Status
              </th>

              <th className="p-4 text-left">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {courses.map(
              (course) => (
                <tr
                  key={
                    course.id
                  }
                  className="border-t border-slate-800"
                >
                  <td className="p-4">
                    {
                      course.title
                    }
                  </td>

                  <td className="p-4">
                    {
                      course.category
                    }
                  </td>

                  <td className="p-4">
                    {
                      course.status
                    }
                  </td>

                  <td className="p-4">
                    <Link
                      href={`/instructor/courses/${course.id}`}
                      className="bg-orange-600 px-4 py-2 rounded text-white"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}