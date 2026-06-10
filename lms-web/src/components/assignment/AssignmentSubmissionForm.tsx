"use client";

export default function AssignmentSubmissionForm() {
  return (
    <form className="bg-white rounded-2xl shadow p-6 space-y-5">
      <h2 className="text-2xl font-bold">
        Submit Assignment
      </h2>

      <textarea
        placeholder="Write your submission..."
        className="w-full border rounded-xl p-4 h-40"
      />

      <button className="bg-orange-500 text-white px-6 py-3 rounded-xl">
        Submit
      </button>
    </form>
  );
}