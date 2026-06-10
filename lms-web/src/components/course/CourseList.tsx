import CourseCard from "./CourseCard";

export default function CourseList() {
  const courses = [
    {
      title: "React Masterclass",
      instructor: "Prasad Kulkarni",
      price: "₹999",
    },

    {
      title: "Node.js Backend",
      instructor: "Orange Tree LMS",
      price: "₹1499",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {courses.map((course) => (
        <CourseCard
          key={course.title}
          title={course.title}
          instructor={course.instructor}
          price={course.price}
        />
      ))}
    </div>
  );
}