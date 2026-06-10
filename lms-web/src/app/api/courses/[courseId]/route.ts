import { NextResponse } from "next/server";

type Params = {
  params: {
    courseId: string;
  };
};

export async function GET(
  request: Request,
  { params }: Params
) {
  return NextResponse.json({
    id: params.courseId,
    title: "React Masterclass",
  });
}