import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { email, password } = body;

    if (
      email === "admin@gmail.com" &&
      password === "123456"
    ) {
      return NextResponse.json({
        success: true,
        message: "Login Successful",
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "Invalid Credentials",
      },
      {
        status: 401,
      }
    );

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Server Error",
      },
      {
        status: 500,
      }
    );
  }
}