"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import CourseTable from "@/components/courses/CourseTable";

import {
  getCourses,
  deleteCourse,
} from "@/services/course.service";

export default function CoursesPage() {
  const [courses, setCourses] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const loadCourses =
    async () => {
      try {
        const response =
          await getCourses();

        setCourses(
          response
        );
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleDelete =
    async (courseId) => {
      const confirmed =
        confirm(
          "Delete course?"
        );

      if (!confirmed) return;

      await deleteCourse(
        courseId
      );

      loadCourses();
    };

  if (loading) {
    return (
      <div className="p-6 text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-3xl font-bold">
          Courses
        </h1>

        <Link
          href="/admin/courses/create"
          className="bg-orange-600 px-4 py-2 rounded"
        >
          Create Course
        </Link>
      </div>

      <CourseTable
        courses={courses}
        onDelete={
          handleDelete
        }
      />
    </div>
  );
}