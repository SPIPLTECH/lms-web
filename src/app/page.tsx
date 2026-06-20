import Link from "next/link";

export default function Home() {
return ( <main className="min-h-screen bg-slate-950 text-white"> <div className="max-w-7xl mx-auto px-6"> <nav className="flex justify-between items-center py-6"> <h1 className="text-2xl font-bold text-orange-500">
Orange LMS </h1>

      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-4 py-2 border border-slate-700 rounded-lg hover:border-orange-500"
        >
          Login
        </Link>

        <Link
          href="/register"
          className="px-4 py-2 bg-orange-600 rounded-lg hover:bg-orange-700"
        >
          Register
        </Link>
      </div>
    </nav>

    <section className="min-h-[80vh] flex items-center">
      <div className="max-w-3xl">
        <span className="bg-orange-600/20 text-orange-400 px-4 py-2 rounded-full text-sm">
          Modern Learning Platform
        </span>

        <h1 className="text-6xl font-bold mt-6 leading-tight">
          Learn Faster.
          <br />
          Build Skills.
          <br />
          Grow Your Career.
        </h1>

        <p className="text-slate-400 text-xl mt-6">
          Access courses, track progress,
          complete quizzes, and earn
          certificates through Orange LMS.
        </p>

        <div className="flex gap-4 mt-8">
          <Link
            href="/register"
            className="bg-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-orange-700"
          >
            Get Started
          </Link>

          <Link
            href="/login"
            className="border border-slate-700 px-6 py-3 rounded-lg hover:border-orange-500"
          >
            Sign In
          </Link>
        </div>
      </div>
    </section>

    <section className="grid md:grid-cols-3 gap-6 pb-20">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-xl font-semibold">
          Courses
        </h3>

        <p className="text-slate-400 mt-2">
          Learn through structured
          modules and lessons.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-xl font-semibold">
          Quizzes
        </h3>

        <p className="text-slate-400 mt-2">
          Test your knowledge and
          improve continuously.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-xl font-semibold">
          Certificates
        </h3>

        <p className="text-slate-400 mt-2">
          Earn certificates after
          course completion.
        </p>
      </div>
    </section>
  </div>
</main>


);
}
