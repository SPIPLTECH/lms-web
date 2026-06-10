"use client";

export default function AssignmentUploadBox() {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-4">
        Upload Assignment
      </h2>

      <input
        type="file"
        className="border p-3 rounded-lg w-full"
      />
    </div>
  );
}