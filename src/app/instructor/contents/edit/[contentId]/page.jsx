"use client";

import { useEffect, useState } from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  getContentById,
  updateContent,
} from "@/services/content.service";

export default function EditContentPage() {
  const { contentId } =
    useParams();

  const router =
    useRouter();

  const [formData,
    setFormData] =
    useState({
      title: "",
      type: "VIDEO",
      url: "",
      order: 1,
    });

  useEffect(() => {
    const loadContent =
      async () => {
        try {
          const response =
            await getContentById(
              contentId
            );

          setFormData(
            response.data ||
              response
          );
        } catch (error) {
          console.error(error);
        }
      };

    if (contentId) {
      loadContent();
    }
  }, [contentId]);

  const handleChange =
    (e) => {
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
        await updateContent(
          contentId,
          formData
        );

        router.back();
      } catch (error) {
        console.error(error);
      }
    };

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="max-w-3xl mx-auto bg-slate-900 rounded-xl p-8">
        <h1 className="text-4xl font-bold mb-8">
          Edit Content
        </h1>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-5"
        >
          <input
            type="text"
            name="title"
            value={
              formData.title
            }
            onChange={
              handleChange
            }
            placeholder="Title"
            className="w-full p-3 rounded bg-slate-800"
          />

          <select
            name="type"
            value={
              formData.type
            }
            onChange={
              handleChange
            }
            className="w-full p-3 rounded bg-slate-800"
          >
            <option value="VIDEO">
              VIDEO
            </option>

            <option value="DOCUMENT">
              DOCUMENT
            </option>

            <option value="TEXT">
              TEXT
            </option>

            <option value="LINK">
              LINK
            </option>

            <option value="PRESENTATION">
              PRESENTATION
            </option>
          </select>

          <input
            type="text"
            name="url"
            value={
              formData.url
            }
            onChange={
              handleChange
            }
            placeholder="Content URL"
            className="w-full p-3 rounded bg-slate-800"
          />

          <input
            type="number"
            name="order"
            value={
              formData.order
            }
            onChange={
              handleChange
            }
            placeholder="Order"
            className="w-full p-3 rounded bg-slate-800"
          />

          <button
            className="
              bg-orange-600
              hover:bg-orange-700
              px-6
              py-3
              rounded-lg
            "
          >
            Update Content
          </button>
        </form>
      </div>
    </div>
  );
}