import Link from "next/link";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-orange-500 text-white p-6">
        <h2 className="text-2xl font-bold mb-8">
          Student Panel
        </h2>

        <nav className="space-y-4">
          <Link href="/dashboard" className="block">
            Dashboard
          </Link>

          <Link href="/my-courses" className="block">
            My Courses
          </Link>

          <Link href="/assignments" className="block">
            Assignments
          </Link>

          <Link href="/quizzes" className="block">
            Quizzes
          </Link>

          <Link href="/certificates" className="block">
            Certificates
          </Link>

          <Link href="/ai-tutor" className="block">
            AI Tutor
          </Link>

          <Link href="/profile" className="block">
            Profile
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