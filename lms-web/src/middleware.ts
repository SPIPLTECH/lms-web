import { NextRequest, NextResponse } from "next/server";

const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
  "/about",
  "/contact",
  "/pricing",
];

export function middleware(
  request: NextRequest
) {
  const { pathname } = request.nextUrl;

  const token =
    request.cookies.get("token")?.value;

  const isPublicRoute =
    publicRoutes.includes(pathname);

  if (!token && !isPublicRoute) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  if (
    token &&
    (pathname === "/login" ||
      pathname === "/register")
  ) {
    return NextResponse.redirect(
      new URL("/dashboard", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};