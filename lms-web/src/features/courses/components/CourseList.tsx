import CourseCard from "./CourseCard";

export default function CourseList() {
  const courses = [
    {
      title: "React Masterclass",
      instructor: "Prasad Kulkarni",
    },

    {
      title: "Node.js Backend",
      instructor: "Orange Tree LMS",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {courses.map((course) => (
        <CourseCard
          key={course.title}
          title={course.title}
          instructor={course.instructor}
        />
      ))}
    </div>
  );
}
