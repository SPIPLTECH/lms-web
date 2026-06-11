export default function StudentsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        Students
      </h1>

      <div className="bg-white p-6 rounded-xl shadow">
        <table className="w-full">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Name</th>
              <th>Email</th>
              <th>Course</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td className="py-2">Prasad Kulkarni</td>
              <td>prasad@example.com</td>
              <td>React Masterclass</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}