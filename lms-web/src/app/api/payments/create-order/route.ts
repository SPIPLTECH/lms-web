import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const order = {
      orderId: "ORD123456",
      amount: body.amount,
      currency: "INR",
    };

    return NextResponse.json({
      success: true,
      order,
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Order Creation Failed",
      },
      {
        status: 500,
      }
    );
  }
}