"use client";

export default function AnalyticsFilter() {
  return (
    <div className="flex gap-4 mb-8">
      <select className="border rounded-lg px-4 py-2">
        <option>Last 7 Days</option>
        <option>Last 30 Days</option>
        <option>Last 6 Months</option>
      </select>

      <button className="bg-orange-500 text-white px-6 py-2 rounded-lg">
        Apply Filter
      </button>
    </div>
  );
}