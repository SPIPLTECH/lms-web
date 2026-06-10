import { NextResponse } from "next/server";

export async function GET() {
  const quizzes = [
    {
      id: 1,
      title: "JavaScript Basics Quiz",
      questions: 10,
    },

    {
      id: 2,
      title: "Database Fundamentals Quiz",
      questions: 15,
    },
  ];

  return NextResponse.json({
    success: true,
    quizzes,
  });
}