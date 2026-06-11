import StudentCard from "./StudentCard";

export default function StudentList() {
  const students = [
    {
      name: "Prasad Kulkarni",
      email: "prasad@gmail.com",
    },

    {
      name: "Rahul Sharma",
      email: "rahul@gmail.com",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {students.map((student) => (
        <StudentCard
          key={student.email}
          name={student.name}
          email={student.email}
        />
      ))}
    </div>
  );
}
