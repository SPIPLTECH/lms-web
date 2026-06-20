"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  createCourse,
} from "@/services/course.service";

export default function CreateCourse() {
  const router = useRouter();
  const handleDelete =
  async (courseId) => {
    const confirmed =
      confirm(
        "Delete this course?"
      );

    if (!confirmed) return;

    try {
      await deleteCourse(
        courseId
      );

      setCourses(
        courses.filter(
          (course) =>
            course.id !==
            courseId
        )
      );
    } catch (error) {
      console.error(error);
    }
  };
  const [formData, setFormData] =
    useState({
      title: "",
      description: "",
      category: "",
      level: "",
      thumbnailUrl: "",
    });

  const [loading, setLoading] =
    useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]:
        e.target.value,
    });
  };

  const handleSubmit =
    async (e) => {
      e.preventDefault();

      try {
        setLoading(true);

        await createCourse(
          formData
        );

        router.push(
          "/admin/courses"
        );
      } catch (error) {
        console.error(error);
        alert(
          "Failed to create course"
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-slate-900 rounded-2xl p-8 shadow-lg">
        <h1 className="text-3xl font-bold mb-6">
          Create Course
        </h1>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label className="block mb-2">
              Title
            </label>

            <input
              type="text"
              name="title"
              value={
                formData.title
              }
              onChange={
                handleChange
              }
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              required
            />
          </div>

          <div>
            <label className="block mb-2">
              Description
            </label>

            <textarea
              name="description"
              value={
                formData.description
              }
              onChange={
                handleChange
              }
              rows="4"
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
            />
          </div>

          <div>
            <label className="block mb-2">
              Category
            </label>

            <input
              type="text"
              name="category"
              value={
                formData.category
              }
              onChange={
                handleChange
              }
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
            />
          </div>

          <div>
            <label className="block mb-2">
              Level
            </label>

            <select
              name="level"
              value={
                formData.level
              }
              onChange={
                handleChange
              }
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
            >
              <option value="">
                Select Level
              </option>

              <option value="Beginner">
                Beginner
              </option>

              <option value="Intermediate">
                Intermediate
              </option>

              <option value="Advanced">
                Advanced
              </option>
            </select>
          </div>

          <div>
            <label className="block mb-2">
              Thumbnail URL
            </label>

            <input
              type="text"
              name="thumbnailUrl"
              value={
                formData.thumbnailUrl
              }
              onChange={
                handleChange
              }
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 transition py-3 rounded-lg font-semibold"
          >
            {loading
              ? "Creating..."
              : "Create Course"}
          </button>
        </form>
      </div>
    </div>
  );
}