export default function OnlineUsers() {
  const users = [
    "Prasad",
    "Rahul",
    "Aman",
  ];

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-xl font-bold mb-4">
        Online Users
      </h2>

      <div className="space-y-3">
        {users.map((user) => (
          <div key={user}>
            🟢 {user}
          </div>
        ))}
      </div>
    </div>
  );
}
