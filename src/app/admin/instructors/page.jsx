"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  getUsers,
} from "@/services/user.service";

export default function InstructorsPage() {
  const [instructors,
    setInstructors] =
    useState([]);

  useEffect(() => {
    const loadUsers =
      async () => {
        try {
          const response =
            await getUsers();

          const users =
            response.data ||
            response;

          const instructorUsers =
            users.filter(
              (user) =>
                user.role ===
                "INSTRUCTOR"
            );

          setInstructors(
            instructorUsers
          );
        } catch (error) {
          console.error(error);
        }
      };

    loadUsers();
  }, []);

  return (
    <div>
      <h1 className="text-4xl font-bold text-white mb-8">
        Instructors
      </h1>

      <div className="grid gap-4">
        {instructors.map(
          (instructor) => (
            <div
              key={
                instructor.id
              }
              className="bg-slate-900 rounded-xl p-6"
            >
              <h2 className="text-2xl font-semibold text-white">
                {
                  instructor.name
                }
              </h2>

              <p className="text-slate-400 mt-2">
                {
                  instructor.email
                }
              </p>

              <div className="mt-4">
                <Link
                  href={`/admin/users/${instructor.id}`}
                  className="bg-orange-600 px-4 py-2 rounded text-white"
                >
                  View
                </Link>
              </div>
            </div>
          )
        )}

        {instructors.length ===
          0 && (
          <div className="bg-slate-900 p-6 rounded-xl text-slate-400">
            No instructors found.
          </div>
        )}
      </div>
    </div>
  );
}