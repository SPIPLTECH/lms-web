import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "OK",
    message: "Orange Tree LMS API Running",
  });
}