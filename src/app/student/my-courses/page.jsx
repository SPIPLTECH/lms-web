"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  getMyEnrollments,
} from "@/services/enrollment.service";

export default function MyCourses() {
  const [courses, setCourses] =
    useState([]);

  useEffect(() => {
    const loadData =
      async () => {
        try {
          const user =
            JSON.parse(
              localStorage.getItem(
                "user"
              )
            );

          const response =
            await getMyEnrollments(
              user.id
            );

          setCourses(
            response.data
          );
        } catch (error) {
          console.error(error);
        }
      };

    loadData();
  }, []);

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">
        My Courses
      </h1>

      <div className="grid gap-6">
        {courses.length === 0 ? (
          <div className="text-slate-400">
            No enrolled courses found.
          </div>
        ) : (
          courses.map(
            (enrollment) => (
              <div
                key={
                  enrollment.id
                }
                className="
                  bg-slate-900
                  p-6
                  rounded-xl
                "
              >
                <h2 className="text-2xl font-bold">
                  {
                    enrollment
                      .course
                      ?.title
                  }
                </h2>

                <p className="text-slate-400 mt-2">
                  {
                    enrollment
                      .course
                      ?.description
                  }
                </p>
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}