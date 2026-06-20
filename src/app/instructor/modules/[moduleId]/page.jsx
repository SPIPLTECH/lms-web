"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getModuleById } from "@/services/module.service";
import { getLessons } from "@/services/lesson.service";
import { deleteLesson } from "@/services/lesson.service";

export default function ModuleDetailsPage() {
  const { moduleId } = useParams();

  const [module, setModule] = useState(null);
  const [lessons, setLessons] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const moduleResponse =
          await getModuleById(moduleId);

        setModule(moduleResponse);

        const lessonResponse =
          await getLessons(moduleId);

        setLessons(lessonResponse);
      } catch (error) {
        console.error(error);
      }
    };

    if (moduleId) {
      loadData();
    }
  }, [moduleId]);

  const handleDelete = async (lessonId) => {
    if (!confirm("Delete this lesson?")) {
      return;
    }

    try {
      await deleteLesson(lessonId);

      setLessons(
        lessons.filter(
          (lesson) =>
            lesson.id !== lessonId
        )
      );
    } catch (error) {
      console.error(error);
    }
  };

  if (!module) {
    return (
      <div className="p-6 text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white">
      {/* Module Card */}
      <div className="bg-slate-900 rounded-xl p-6 mb-8">
        <h1 className="text-4xl font-bold mb-3">
          {module.title}
        </h1>

        <p className="text-slate-400">
          {module.description}
        </p>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">
          Lessons
        </h2>

        <Link
          href={`/instructor/lessons/create/${moduleId}`}
          className="bg-orange-600 px-5 py-3 rounded-lg hover:bg-orange-700"
        >
          Add Lesson
        </Link>
      </div>

      {/* Lesson List */}
      <div className="space-y-5">
        {lessons.length === 0 ? (
          <div className="bg-slate-900 p-6 rounded-xl">
            No lessons found.
          </div>
        ) : (
          lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="bg-slate-900 p-6 rounded-xl flex justify-between items-center"
            >
              <div>
                <h3 className="text-2xl font-semibold">
                  {lesson.title}
                </h3>

                <p className="text-slate-400 mt-2">
                  {lesson.description}
                </p>
              </div>

              <div className="flex gap-3">
                <Link
                  href={`/instructor/contents/${lesson.id}`}
                  className="bg-green-600 px-4 py-2 rounded"
                >
                  Contents
                </Link>

                <Link
                  href={`/instructor/lessons/edit/${lesson.id}`}
                  className="bg-blue-600 px-4 py-2 rounded"
                >
                  Edit
                </Link>

                <button
                  onClick={() =>
                    handleDelete(lesson.id)
                  }
                  className="bg-red-600 px-4 py-2 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}