"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  getModuleById,
} from "@/services/module.service";

import {
  getLessons,
  deleteLesson,
} from "@/services/lesson.service";

export default function ModuleDetails() {
  const { moduleId } =
    useParams();

  const [module, setModule] =
    useState(null);

  const [lessons, setLessons] =
    useState([]);

  useEffect(() => {
    const loadData =
      async () => {
        const moduleData =
          await getModuleById(
            moduleId
          );

        setModule(
          moduleData
        );

        const lessonData =
          await getLessons(
            moduleId
          );

        setLessons(
          lessonData
        );
      };

    if (moduleId) {
      loadData();
    }
  }, [moduleId]);

  const handleDelete =
    async (lessonId) => {
      await deleteLesson(
        lessonId
      );

      setLessons(
        lessons.filter(
          (lesson) =>
            lesson.id !==
            lessonId
        )
      );
    };

  if (!module) {
    return (
      <div className="text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-6 rounded-xl">
        <h1 className="text-3xl text-white font-bold">
          {module.title}
        </h1>

        <p className="text-slate-400 mt-2">
          {
            module.description
          }
        </p>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl text-white font-bold">
          Lessons
        </h2>

        <Link
          href={`/instructor/lessons/create/${moduleId}`}
          className="bg-orange-600 px-5 py-2 rounded text-white"
        >
          Add Lesson
        </Link>
      </div>

      {lessons.map(
        (lesson) => (
          <div
            key={lesson.id}
            className="bg-slate-900 p-5 rounded-xl flex justify-between"
          >
            <div>
              <h3 className="text-white text-xl">
                {lesson.title}
              </h3>

              <p className="text-slate-400">
                {
                  lesson.description
                }
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                href={`/instructor/lessons/${lesson.id}`}
                className="bg-green-600 px-4 py-2 rounded text-white"
              >
                Contents
              </Link>

              <Link
                href={`/instructor/lessons/edit/${lesson.id}`}
                className="bg-blue-600 px-4 py-2 rounded text-white"
              >
                Edit
              </Link>

              <button
                onClick={() =>
                  handleDelete(
                    lesson.id
                  )
                }
                className="bg-red-600 px-4 py-2 rounded text-white"
              >
                Delete
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}