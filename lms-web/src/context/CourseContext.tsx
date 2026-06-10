"use client";

import {
  createContext,
  useContext,
  useState,
} from "react";

type Course = {
  id: number;
  title: string;
};

type CourseContextType = {
  courses: Course[];
};

const CourseContext =
  createContext<CourseContextType | null>(
    null
  );

export function CourseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [courses] =
    useState<Course[]>([
      {
        id: 1,
        title: "React Masterclass",
      },
    ]);

  return (
    <CourseContext.Provider
      value={{
        courses,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
}

export function useCourseContext() {
  const context =
    useContext(CourseContext);

  if (!context) {
    throw new Error(
      "useCourseContext must be used inside CourseProvider"
    );
  }

  return context;
}