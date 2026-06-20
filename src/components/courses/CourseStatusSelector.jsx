"use client";

export default function CourseStatusSelector({
  value,
  onChange,
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="bg-slate-800 border border-slate-700 text-white p-3 rounded-lg"
    >
      <option value="DRAFT">
        DRAFT
      </option>

      <option value="PUBLISHED">
        PUBLISHED
      </option>

      <option value="ARCHIVED">
        ARCHIVED
      </option>
    </select>
  );
}