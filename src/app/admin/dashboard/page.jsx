"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  getUsers,
} from "@/services/user.service";

import {
  getCourses,
} from "@/services/course.service";

export default function AdminDashboard() {
  const [stats, setStats] =
    useState({
      users: 0,
      courses: 0,
      students: 0,
      instructors: 0,
    });

  useEffect(() => {
    const loadStats =
      async () => {
        try {
          const usersResponse =
            await getUsers();

          const coursesResponse =
            await getCourses();

          const users =
            usersResponse.data ||
            [];

          const courses =
            coursesResponse.data ||
            [];

          setStats({
            users:
              users.length,

            courses:
              courses.length,

            students:
              users.filter(
                (
                  user
                ) =>
                  user.role ===
                  "STUDENT"
              ).length,

            instructors:
              users.filter(
                (
                  user
                ) =>
                  user.role ===
                  "INSTRUCTOR"
              ).length,
          });
        } catch (error) {
          console.error(
            error
          );
        }
      };

    loadStats();
  }, []);

  return (
    <div>
      <h1 className="text-4xl font-bold text-white mb-8">
        Admin Dashboard
      </h1>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-slate-900 p-6 rounded-xl">
          <h3 className="text-slate-400">
            Total Users
          </h3>

          <p className="text-4xl font-bold text-white mt-2">
            {
              stats.users
            }
          </p>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl">
          <h3 className="text-slate-400">
            Total Courses
          </h3>

          <p className="text-4xl font-bold text-white mt-2">
            {
              stats.courses
            }
          </p>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl">
          <h3 className="text-slate-400">
            Students
          </h3>

          <p className="text-4xl font-bold text-white mt-2">
            {
              stats.students
            }
          </p>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl">
          <h3 className="text-slate-400">
            Instructors
          </h3>

          <p className="text-4xl font-bold text-white mt-2">
            {
              stats.instructors
            }
          </p>
        </div>
      </div>
    </div>
  );
}