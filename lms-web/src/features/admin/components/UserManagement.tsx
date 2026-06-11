export default function UserManagement() {
  const users = [
    "Prasad Kulkarni",
    "Rahul Sharma",
  ];

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-4">
        Users
      </h2>

      <ul className="space-y-3">
        {users.map((user) => (
          <li key={user}>
            {user}
          </li>
        ))}
      </ul>
    </div>
  );
}
