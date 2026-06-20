"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  getCourseById,
  updateCourse,
} from "@/services/course.service";

export default function EditCourse() {
  const { courseId } =
    useParams();

  const router =
    useRouter();

  const [formData, setFormData] =
    useState({
      title: "",
      description: "",
      category: "",
      level: "",
      thumbnailUrl: "",
    });

  useEffect(() => {
    const loadCourse =
      async () => {
        const response =
          await getCourseById(
            courseId
          );

        setFormData(
          response
        );
      };

    if (courseId) {
      loadCourse();
    }
  }, [courseId]);

  const handleSubmit =
    async (e) => {
      e.preventDefault();

      try {
        await updateCourse(
          courseId,
          formData
        );

        router.push(
          "/admin/courses"
        );
      } catch (error) {
        console.error(error);
      }
    };

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center items-center p-6">
      <div className="bg-slate-900 p-8 rounded-xl w-full max-w-2xl">
        <h1 className="text-3xl text-white font-bold mb-6">
          Edit Course
        </h1>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <input
            type="text"
            value={
              formData.title ||
              ""
            }
            onChange={(e) =>
              setFormData({
                ...formData,
                title:
                  e.target
                    .value,
              })
            }
            placeholder="Title"
            className="w-full p-3 bg-slate-800 text-white rounded"
          />

          <textarea
            value={
              formData.description ||
              ""
            }
            onChange={(e) =>
              setFormData({
                ...formData,
                description:
                  e.target
                    .value,
              })
            }
            placeholder="Description"
            className="w-full p-3 bg-slate-800 text-white rounded"
          />

          <input
            type="text"
            value={
              formData.category ||
              ""
            }
            onChange={(e) =>
              setFormData({
                ...formData,
                category:
                  e.target
                    .value,
              })
            }
            placeholder="Category"
            className="w-full p-3 bg-slate-800 text-white rounded"
          />

          <input
            type="text"
            value={
              formData.level ||
              ""
            }
            onChange={(e) =>
              setFormData({
                ...formData,
                level:
                  e.target
                    .value,
              })
            }
            placeholder="Level"
            className="w-full p-3 bg-slate-800 text-white rounded"
          />

          <button className="w-full bg-orange-600 py-3 rounded">
            Update Course
          </button>
        </form>
      </div>
    </div>
  );
}