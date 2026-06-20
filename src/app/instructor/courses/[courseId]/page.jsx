"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getCourseById } from "@/services/course.service";

import { getModules, deleteModule } from "@/services/module.service";

export default function CourseDetails() {
  const { courseId } = useParams();

  const [course, setCourse] = useState(null);

  const [modules, setModules] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const courseResponse = await getCourseById(courseId);

        setCourse(courseResponse);

        const moduleResponse = await getModules(courseId);

        setModules(moduleResponse);
      } catch (error) {
        console.error(error);
      }
    };

    if (courseId) {
      loadData();
    }
  }, [courseId]);

  const handleDelete = async (moduleId) => {
    if (!confirm("Delete this module?")) return;

    try {
      await deleteModule(moduleId);

      setModules(modules.filter((module) => module.id !== moduleId));
    } catch (error) {
      console.error(error);
    }
  };

  if (!course) {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-8 rounded-xl text-white">
        <h1 className="text-4xl font-bold mb-4">{course.title}</h1>

        <p className="text-slate-300 mb-6">{course.description}</p>

        <div className="space-y-2">
          <p>Category: {course.category}</p>

          <p>Level: {course.level}</p>

          <p>Status: {course.status}</p>
        </div>

        <Link
          href={`/instructor/modules/create/${courseId}`}
          className="inline-block mt-8 bg-orange-600 px-6 py-3 rounded-lg"
        >
          Add Module
        </Link>
      </div>

      <div className="bg-slate-900 rounded-xl p-6">
        <h2 className="text-2xl text-white font-bold mb-4">Modules</h2>

        {modules.length === 0 ? (
          <p className="text-slate-400">No modules found.</p>
        ) : (
          <div className="space-y-4">
            {modules.map((module) => (
              <div
                key={module.id}
                className="bg-slate-800 p-4 rounded-lg flex justify-between items-center"
              >
                <div>
                  <h3 className="text-white text-lg font-semibold">
                    {module.title}
                  </h3>

                  <p className="text-slate-400">Order: {module.order}</p>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/instructor/modules/${module.id}`}
                    className="bg-green-600 px-4 py-2 rounded text-white"
                  >
                    Lessons
                  </Link>

                  <Link
                    href={`/instructor/modules/edit/${module.id}`}
                    className="bg-blue-600 px-4 py-2 rounded text-white"
                  >
                    Edit
                  </Link>

                  <button
                    onClick={() => handleDelete(module.id)}
                    className="bg-red-600 px-4 py-2 rounded text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
