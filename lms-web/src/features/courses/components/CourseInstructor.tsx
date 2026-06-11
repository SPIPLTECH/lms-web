type CourseInstructorProps = {
  name: string;
};

export default function CourseInstructor({
  name,
}: CourseInstructorProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-4">
        Instructor
      </h2>

      <p>{name}</p>
    </div>
  );
}
