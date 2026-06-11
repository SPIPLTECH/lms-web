export default function ProfilePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">
        My Profile
      </h1>

      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <div>
          <strong>Name:</strong> Prasad Kulkarni
        </div>

        <div>
          <strong>Email:</strong> prasad@example.com
        </div>

        <div>
          <strong>Role:</strong> Student
        </div>
      </div>
    </div>
  );
}