export default function CourseCurriculum() {
  const topics = [
    "Introduction",
    "Frontend Basics",
    "Backend Development",
    "Project Deployment",
  ];

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-6">
        Curriculum
      </h2>

      <ul className="space-y-3">
        {topics.map((topic) => (
          <li
            key={topic}
            className="border-b pb-3"
          >
            {topic}
          </li>
        ))}
      </ul>
    </div>
  );
}