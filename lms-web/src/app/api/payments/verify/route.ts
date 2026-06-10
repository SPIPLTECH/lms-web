import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    return NextResponse.json({
      success: true,
      message: "Payment Verified Successfully",
      payment: body,
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Payment Verification Failed",
      },
      {
        status: 500,
      }
    );
  }
}