"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  createModule,
} from "@/services/module.service";

export default function CreateModule() {
  const { courseId } =
    useParams();

  const router =
    useRouter();

  const [formData, setFormData] =
    useState({
      title: "",
      description: "",
      order: 1,
    });

  const handleSubmit =
    async (e) => {
      e.preventDefault();

      try {
        await createModule({
          ...formData,
          courseId,
        });

        router.push(
          `/instructor/courses/${courseId}`
        );
      } catch (error) {
        console.error(
          error
        );
      }
    };

  return (
    <div className="max-w-2xl mx-auto bg-slate-900 p-8 rounded-xl">
      <h1 className="text-3xl text-white font-bold mb-6">
        Create Module
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <input
          type="text"
          placeholder="Module Title"
          className="w-full p-3 rounded bg-slate-800 text-white"
          onChange={(e) =>
            setFormData({
              ...formData,
              title:
                e.target.value,
            })
          }
        />

        <textarea
          placeholder="Description"
          className="w-full p-3 rounded bg-slate-800 text-white"
          onChange={(e) =>
            setFormData({
              ...formData,
              description:
                e.target.value,
            })
          }
        />

        <input
          type="number"
          placeholder="Order"
          className="w-full p-3 rounded bg-slate-800 text-white"
          onChange={(e) =>
            setFormData({
              ...formData,
              order:
                Number(
                  e.target.value
                ),
            })
          }
        />

        <button className="bg-orange-600 px-6 py-3 rounded text-white">
          Create Module
        </button>
      </form>
    </div>
  );
}