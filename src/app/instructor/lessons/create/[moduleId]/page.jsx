"use client";

import { useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { createLesson } from "@/services/lesson.service";

export default function CreateLesson() {
  const { moduleId } = useParams();

  const router = useRouter();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    order: 2,
  });
  const handleSubmit = async (e) => {
    e.preventDefault();

    await createLesson({
      ...formData,
      moduleId,
    });

    router.push(`/instructor/modules/${moduleId}`);
  };

  return (
    <div className="max-w-2xl mx-auto bg-slate-900 p-8 rounded-xl">
      <h1 className="text-3xl text-white mb-6">Create Lesson</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Lesson Title"
          className="w-full p-3 rounded bg-slate-800 text-white"
          onChange={(e) =>
            setFormData({
              ...formData,
              title: e.target.value,
            })
          }
        />

        <textarea
          placeholder="Description"
          className="w-full p-3 rounded bg-slate-800 text-white"
          onChange={(e) =>
            setFormData({
              ...formData,
              description: e.target.value,
            })
          }
        />
        <input
          type="number"
          value={formData.order}
          placeholder="Lesson Order"
          onChange={(e) =>
            setFormData({
              ...formData,
              order: Number(e.target.value),
            })
          }
          className="w-full p-3 rounded bg-slate-800 text-white"
        />
        <button
          type="submit"
          className="bg-orange-600 px-6 py-3 rounded text-white"
        >
          Create Lesson
        </button>
      </form>
    </div>
  );
}
