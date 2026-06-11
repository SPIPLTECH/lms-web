import TeacherCard from "./TeacherCard";

export default function TeacherList() {
  const teachers = [
    {
      name: "Prasad Kulkarni",
      subject: "Frontend Development",
    },

    {
      name: "Rahul Sharma",
      subject: "Backend Development",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {teachers.map((teacher) => (
        <TeacherCard
          key={teacher.name}
          name={teacher.name}
          subject={teacher.subject}
        />
      ))}
    </div>
  );
}
