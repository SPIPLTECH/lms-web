import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-black text-white p-6">
        <h2 className="text-2xl font-bold mb-8">
          Orange Tree LMS
        </h2>

        <nav className="space-y-4">
          <Link href="/dashboard" className="block">
            Dashboard
          </Link>

          <Link href="/users" className="block">
            Users
          </Link>

          <Link href="/courses" className="block">
            Courses
          </Link>

          <Link href="/reports" className="block">
            Reports
          </Link>

          <Link href="/settings" className="block">
            Settings
          </Link>

          <Link href="/payments" className="block">
            Payments
          </Link>
        </nav>
      </aside>

      <main className="flex-1 bg-gray-100 p-8">
        {children}
      </main>
    </div>
  );
}
