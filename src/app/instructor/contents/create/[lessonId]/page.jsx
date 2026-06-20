"use client";

import { useState } from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  createContent,
} from "@/services/content.service";

export default function CreateContent() {
  const { lessonId } =
    useParams();

  const router =
    useRouter();

  const [formData, setFormData] =
    useState({
      title: "",
      type: "VIDEO",
      videoUrl: "",
      fileUrl: "",
      htmlContent: "",
      externalUrl: "",
      duration: "",
      order: 1,
    });

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

      const data = {
        title:
          formData.title,
        type:
          formData.type,
        order: Number(
          formData.order
        ),
        lessonId,
      };

      if (
        formData.type ===
        "VIDEO"
      ) {
        data.videoUrl =
          formData.videoUrl;

        data.duration =
          Number(
            formData.duration
          );
      }

      if (
        formData.type ===
        "DOCUMENT"
      ) {
        data.fileUrl =
          formData.fileUrl;
      }

      if (
        formData.type ===
        "TEXT"
      ) {
        data.htmlContent =
          formData.htmlContent;
      }

      if (
        formData.type ===
        "LINK"
      ) {
        data.externalUrl =
          formData.externalUrl;
      }

      try {
        await createContent(
          data
        );

        router.push(
          `/instructor/contents/${lessonId}`
        );
      } catch (error) {
        console.error(error);
      }
    };

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="max-w-3xl mx-auto bg-slate-900 rounded-xl p-8">
        <h1 className="text-4xl font-bold mb-8">
          Create Content
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
            placeholder="Title"
            value={
              formData.title
            }
            onChange={
              handleChange
            }
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

          {formData.type ===
            "VIDEO" && (
            <>
              <input
                type="text"
                name="videoUrl"
                placeholder="Video URL"
                value={
                  formData.videoUrl
                }
                onChange={
                  handleChange
                }
                className="w-full p-3 rounded bg-slate-800"
              />

              <input
                type="number"
                name="duration"
                placeholder="Duration (minutes)"
                value={
                  formData.duration
                }
                onChange={
                  handleChange
                }
                className="w-full p-3 rounded bg-slate-800"
              />
            </>
          )}

          {formData.type ===
            "DOCUMENT" && (
            <input
              type="text"
              name="fileUrl"
              placeholder="File URL"
              value={
                formData.fileUrl
              }
              onChange={
                handleChange
              }
              className="w-full p-3 rounded bg-slate-800"
            />
          )}

          {formData.type ===
            "TEXT" && (
            <textarea
              name="htmlContent"
              placeholder="Text Content"
              value={
                formData.htmlContent
              }
              onChange={
                handleChange
              }
              rows={5}
              className="w-full p-3 rounded bg-slate-800"
            />
          )}

          {formData.type ===
            "LINK" && (
            <input
              type="text"
              name="externalUrl"
              placeholder="External URL"
              value={
                formData.externalUrl
              }
              onChange={
                handleChange
              }
              className="w-full p-3 rounded bg-slate-800"
            />
          )}

          <input
            type="number"
            name="order"
            placeholder="Order"
            value={
              formData.order
            }
            onChange={
              handleChange
            }
            className="w-full p-3 rounded bg-slate-800"
          />

          <button
            type="submit"
            className="
              bg-orange-600
              hover:bg-orange-700
              px-6
              py-3
              rounded-lg
            "
          >
            Create Content
          </button>
        </form>
      </div>
    </div>
  );
}