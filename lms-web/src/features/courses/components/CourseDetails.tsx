type CourseDetailsProps = {
  description: string;
};

export default function CourseDetails({
  description,
}: CourseDetailsProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-4">
        Course Details
      </h2>

      <p className="text-gray-600">
        {description}
      </p>
    </div>
  );
}
