"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import {
  getCourseById,
  updateCourseStatus,
} from "@/services/course.service";

import CourseStatusSelector from "@/components/courses/CourseStatusSelector";

export default function CourseDetails() {
  const { courseId } =
    useParams();

  const [course, setCourse] =
    useState(null);

  const [status, setStatus] =
    useState("");

  useEffect(() => {
    const loadCourse =
      async () => {
        try {
          const response =
            await getCourseById(
              courseId
            );

          setCourse(response);

          setStatus(
            response.status
          );
        } catch (error) {
          console.error(error);
        }
      };

    if (courseId) {
      loadCourse();
    }
  }, [courseId]);

  const handleStatusUpdate =
    async () => {
      try {
        await updateCourseStatus(
          courseId,
          status
        );

        setCourse({
          ...course,
          status,
        });

        alert(
          "Course status updated successfully"
        );
      } catch (error) {
        console.error(error);
        alert(
          "Failed to update status"
        );
      }
    };

  if (!course) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto bg-slate-900 rounded-2xl p-8 shadow-lg">
        <h1 className="text-4xl font-bold mb-4">
          {course.title}
        </h1>

        <p className="text-slate-300 mb-6">
          {course.description}
        </p>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800 p-4 rounded-xl">
            <p className="text-slate-400 text-sm">
              Category
            </p>

            <p className="font-semibold">
              {course.category ||
                "N/A"}
            </p>
          </div>

          <div className="bg-slate-800 p-4 rounded-xl">
            <p className="text-slate-400 text-sm">
              Level
            </p>

            <p className="font-semibold">
              {course.level ||
                "N/A"}
            </p>
          </div>

          <div className="bg-slate-800 p-4 rounded-xl">
            <p className="text-slate-400 text-sm">
              Status
            </p>

            <p className="font-semibold">
              {course.status}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-6">
          <h2 className="text-2xl font-semibold mb-4">
            Update Course Status
          </h2>

          <div className="flex gap-4 items-center">
            <CourseStatusSelector
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value
                )
              }
            />

            <button
              onClick={
                handleStatusUpdate
              }
              className="bg-orange-600 hover:bg-orange-700 px-5 py-3 rounded-lg font-semibold"
            >
              Update Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}