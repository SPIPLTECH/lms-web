"use client";

import Link from "next/link";

export default function CourseTable({
  courses,
  onDelete,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border border-slate-800">
        <thead>
          <tr className="bg-slate-900">
            <th className="p-4">
              Title
            </th>

            <th className="p-4">
              Category
            </th>

            <th className="p-4">
              Level
            </th>

            <th className="p-4">
              Status
            </th>

            <th className="p-4">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {courses.map(
            (course) => (
              <tr
                key={course.id}
                className="border-t border-slate-800"
              >
                <td className="p-4">
                  {course.title}
                </td>

                <td className="p-4">
                  {course.category}
                </td>

                <td className="p-4">
                  {course.level}
                </td>

                <td className="p-4">
                  {course.status}
                </td>

                <td className="p-4">
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/courses/${course.id}`}
                      className="bg-blue-600 px-3 py-1 rounded"
                    >
                      View
                    </Link>

                    <Link
                      href={`/admin/courses/edit/${course.id}`}
                      className="bg-orange-600 px-3 py-1 rounded"
                    >
                      Edit
                    </Link>

                    <button
                      onClick={() =>
                        onDelete(
                          course.id
                        )
                      }
                      className="bg-red-600 px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}