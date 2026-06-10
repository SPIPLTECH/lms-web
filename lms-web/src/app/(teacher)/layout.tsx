import Link from "next/link";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-600 text-white p-6">
        <h2 className="text-2xl font-bold mb-8">
          Teacher Panel
        </h2>

        <nav className="space-y-4">
          <Link href="/dashboard" className="block">
            Dashboard
          </Link>

          <Link href="/create-course" className="block">
            Create Course
          </Link>

          <Link href="/manage-courses" className="block">
            Manage Courses
          </Link>

          <Link href="/students" className="block">
            Students
          </Link>

          <Link href="/analytics" className="block">
            Analytics
          </Link>

          <Link href="/assignments" className="block">
            Assignments
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 bg-gray-100">
        {children}
      </main>
    </div>
  );
}