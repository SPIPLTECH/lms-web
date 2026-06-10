import { NextResponse } from "next/server";

export async function GET() {
  const certificates = [
    {
      id: 1,
      course: "React Masterclass",
      issuedTo: "Prasad Kulkarni",
    },
  ];

  return NextResponse.json({
    success: true,
    certificates,
  });
}