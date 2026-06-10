type CoursePageProps = {
  params: {
    courseId: string;
  };
};

export default function CourseDetailsPage({
  params,
}: CoursePageProps) {
  return (
    <div className="min-h-screen p-10 bg-gray-100">
      <div className="bg-white rounded-xl shadow p-8">
        <h1 className="text-4xl font-bold mb-4">
          Course Details
        </h1>

        <p className="text-gray-600 mb-6">
          Course ID: {params.courseId}
        </p>

        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">
              React Masterclass
            </h2>

            <p className="text-gray-500">
              Learn React.js from beginner to advanced level.
            </p>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-xl font-semibold mb-2">
              Instructor
            </h3>

            <p>Prasad Kulkarni</p>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-xl font-semibold mb-2">
              Course Modules
            </h3>

            <ul className="list-disc pl-5 space-y-2">
              <li>Introduction to React</li>
              <li>Components and Props</li>
              <li>State Management</li>
              <li>API Integration</li>
            </ul>
          </div>

          <button className="mt-6 bg-orange-500 text-white px-6 py-3 rounded-lg">
            Enroll Now
          </button>
        </div>
      </div>
    </div>
  );
}