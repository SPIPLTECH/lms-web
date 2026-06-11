export default function AIHistory() {
  const history = [
    "React Explanation",
    "Database Notes",
  ];

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-4">
        History
      </h2>

      <ul className="space-y-3">
        {history.map((item) => (
          <li key={item}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
