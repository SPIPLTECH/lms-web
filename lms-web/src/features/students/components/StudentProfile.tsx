type StudentProfileProps = {
  name: string;
  course: string;
};

export default function StudentProfile({
  name,
  course,
}: StudentProfileProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-4">
        {name}
      </h2>

      <p>Course: {course}</p>
    </div>
  );
}
