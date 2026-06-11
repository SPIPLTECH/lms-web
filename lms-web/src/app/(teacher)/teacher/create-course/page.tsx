"use client";

export default function CreateCoursePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        Create Course
      </h1>

      <form className="bg-white p-6 rounded-xl shadow space-y-4">
        <div>
          <label className="block mb-1">
            Course Title
          </label>

          <input
            type="text"
            placeholder="Enter course title"
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>

        <div>
          <label className="block mb-1">
            Description
          </label>

          <textarea
            placeholder="Course description"
            className="w-full border rounded-lg px-4 py-2 h-40"
          />
        </div>

        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg">
          Create Course
        </button>
      </form>
    </div>
  );
}