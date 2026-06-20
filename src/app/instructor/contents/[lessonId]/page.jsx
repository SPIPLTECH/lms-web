"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  getContents,
  deleteContent,
} from "@/services/content.service";

export default function LessonContentsPage() {
  const { lessonId } = useParams();

  const [contents, setContents] =
    useState([]);

  useEffect(() => {
    loadContents();
  }, [lessonId]);

  const loadContents = async () => {
    try {
      const response =
        await getContents(
          lessonId
        );

      setContents(
        response.data ||
          response
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete =
    async (contentId) => {
      if (
        !confirm(
          "Delete this content?"
        )
      ) {
        return;
      }

      await deleteContent(
        contentId
      );

      setContents(
        contents.filter(
          (content) =>
            content.id !==
            contentId
        )
      );
    };

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">
          Lesson Contents
        </h1>

        <Link
          href={`/instructor/contents/create/${lessonId}`}
          className="bg-orange-600 px-5 py-3 rounded-lg"
        >
          Add Content
        </Link>
      </div>

      <div className="space-y-4">
        {contents.length === 0 ? (
          <div className="bg-slate-900 p-6 rounded-xl">
            No content found.
          </div>
        ) : (
          contents.map(
            (content) => (
              <div
                key={content.id}
                className="bg-slate-900 rounded-xl p-6 flex justify-between items-center"
              >
                <div>
                  <h2 className="text-2xl font-semibold">
                    {content.title}
                  </h2>

                  <p className="text-slate-400 mt-2">
                    {
                      content.type
                    }
                  </p>

                  <p className="text-slate-500 mt-1">
                    {
                      content.url
                    }
                  </p>
                </div>

                <div className="flex gap-3">
                  <Link
                    href={`/instructor/contents/edit/${content.id}`}
                    className="bg-blue-600 px-4 py-2 rounded"
                  >
                    Edit
                  </Link>

                  <button
                    onClick={() =>
                      handleDelete(
                        content.id
                      )
                    }
                    className="bg-red-600 px-4 py-2 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}