export default function AnalyticsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        Analytics
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          Total Students: 120
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          Active Courses: 8
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          Assignments Submitted: 350
        </div>
      </div>
    </div>
  );
}