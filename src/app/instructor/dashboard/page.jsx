export default function InstructorDashboard() {
    return (
      <div>
        <h1 className="text-4xl font-bold text-white mb-8">
          Instructor Dashboard
        </h1>
  
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-slate-900 p-6 rounded-xl">
            <h3 className="text-slate-400">
              Assigned Courses
            </h3>
  
            <p className="text-4xl font-bold text-white mt-2">
              0
            </p>
          </div>
  
          <div className="bg-slate-900 p-6 rounded-xl">
            <h3 className="text-slate-400">
              Modules
            </h3>
  
            <p className="text-4xl font-bold text-white mt-2">
              0
            </p>
          </div>
  
          <div className="bg-slate-900 p-6 rounded-xl">
            <h3 className="text-slate-400">
              Lessons
            </h3>
  
            <p className="text-4xl font-bold text-white mt-2">
              0
            </p>
          </div>
        </div>
      </div>
    );
  }