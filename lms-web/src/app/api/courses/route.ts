import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([
    {
      id: 1,
      title: "React Masterclass",
    },

    {
      id: 2,
      title: "Node.js Backend",
    },
  ]);
}