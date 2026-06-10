export default function ActivityTimeline() {
  const activities = [
    "New student registered",
    "Course completed",
    "Quiz submitted",
    "Certificate generated",
  ];

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-6">
        Recent Activity
      </h2>

      <ul className="space-y-4">
        {activities.map((activity, index) => (
          <li
            key={index}
            className="border-b pb-3"
          >
            {activity}
          </li>
        ))}
      </ul>
    </div>
  );
}