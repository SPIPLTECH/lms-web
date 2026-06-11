export default function CourseCurriculum() {
  const topics = [
    "Introduction",
    "Frontend",
    "Backend",
  ];

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <ul className="space-y-3">
        {topics.map((topic) => (
          <li key={topic}>
            {topic}
          </li>
        ))}
      </ul>
    </div>
  );
}
