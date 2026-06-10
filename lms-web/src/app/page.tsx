import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-100">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center py-32 px-6">
        <h1 className="text-6xl font-bold text-orange-500 mb-6">
          Orange Tree LMS
        </h1>

        <p className="text-xl text-gray-600 max-w-3xl mb-8">
          AI Powered Learning Management System for
          students, teachers, and organizations.
        </p>

        <div className="flex gap-4">
          <Link
            href="/register"
            className="bg-orange-500 text-white px-6 py-3 rounded-xl"
          >
            Get Started
          </Link>

          <Link
            href="/pricing"
            className="border border-orange-500 text-orange-500 px-6 py-3 rounded-xl"
          >
            View Pricing
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-8 bg-white">
        <h2 className="text-4xl font-bold text-center mb-12">
          Platform Features
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-100 p-8 rounded-2xl">
            <h3 className="text-2xl font-semibold mb-4">
              AI Tutor
            </h3>

            <p className="text-gray-600">
              Personalized AI learning assistant for students.
            </p>
          </div>

          <div className="bg-gray-100 p-8 rounded-2xl">
            <h3 className="text-2xl font-semibold mb-4">
              Course Management
            </h3>

            <p className="text-gray-600">
              Create and manage courses efficiently.
            </p>
          </div>

          <div className="bg-gray-100 p-8 rounded-2xl">
            <h3 className="text-2xl font-semibold mb-4">
              Analytics
            </h3>

            <p className="text-gray-600">
              Advanced reports and student insights.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}