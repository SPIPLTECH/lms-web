import { NextResponse } from "next/server";

export async function GET() {
  const assignments = [
    {
      id: 1,
      title: "React Assignment",
      dueDate: "2026-06-15",
    },

    {
      id: 2,
      title: "Node.js API Assignment",
      dueDate: "2026-06-20",
    },
  ];

  return NextResponse.json({
    success: true,
    assignments,
  });
}