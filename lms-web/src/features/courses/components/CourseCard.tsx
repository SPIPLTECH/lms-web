type CourseCardProps = {
  title: string;
  instructor: string;
};

export default function CourseCard({
  title,
  instructor,
}: CourseCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-2">
        {title}
      </h2>

      <p className="text-gray-600">
        Instructor: {instructor}
      </p>
    </div>
  );
}
