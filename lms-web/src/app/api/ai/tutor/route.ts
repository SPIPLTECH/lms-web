import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  return NextResponse.json({
    question: body.question,
    answer: "This is AI generated response.",
  });
}