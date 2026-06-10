import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    return NextResponse.json({
      success: true,
      message: "User Registered Successfully",
      data: body,
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Registration Failed",
      },
      {
        status: 500,
      }
    );
  }
}