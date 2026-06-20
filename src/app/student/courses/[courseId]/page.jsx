"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { enrollCourse } from "@/services/enrollment.service";
import { getCourseById } from "@/services/course.service";

export default function CourseDetails() {
  const { courseId } = useParams();

  const [course, setCourse] = useState(null);

  useEffect(() => {
    const loadCourse = async () => {
      const data = await getCourseById(courseId);

      setCourse(data);
    };

    if (courseId) {
      loadCourse();
    }
  }, [courseId]);

  if (!course) {
    return <div>Loading...</div>;
  }

  const handleEnroll = async () => {
    try {
      await enrollCourse(courseId);

      alert("Course enrolled successfully");
    } catch (error) {
      console.error(error);
    }
  };
  return (
    <div className="bg-slate-900 p-8 rounded-xl">
      <h1 className="text-4xl font-bold mb-4">{course.title}</h1>

      <p className="text-slate-300 mb-6">{course.description}</p>

      <p>
        Category:
        {course.category}
      </p>

      <p>
        Level:
        {course.level}
      </p>

      <button
  onClick={handleEnroll}
  className="
    mt-8
    bg-orange-600
    px-6
    py-3
    rounded-lg
  "
>
  Enroll Now
</button>
    </div>
  );
}
