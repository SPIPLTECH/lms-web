import { NextResponse } from "next/server";

type Params = {
  params: {
    userId: string;
  };
};

export async function GET(
  request: Request,
  { params }: Params
) {
  return NextResponse.json({
    id: params.userId,
    name: "Prasad Kulkarni",
  });
}