import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    return NextResponse.json({
      success: true,
      score: 8,
      total: 10,
      submittedAnswers: body,
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Quiz Submission Failed",
      },
      {
        status: 500,
      }
    );
  }
}