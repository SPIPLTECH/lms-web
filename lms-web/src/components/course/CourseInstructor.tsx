type CourseInstructorProps = {
  name: string;
  bio: string;
};

export default function CourseInstructor({
  name,
  bio,
}: CourseInstructorProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-4">
        Instructor
      </h2>

      <h3 className="text-xl font-semibold">
        {name}
      </h3>

      <p className="text-gray-600 mt-3">
        {bio}
      </p>
    </div>
  );
}