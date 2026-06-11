import { NextRequest, NextResponse } from "next/server";

const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/about",
  "/contact",
  "/pricing",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("token")?.value;
  const role = request.cookies.get("role")?.value;

  const isPublicRoute = publicRoutes.includes(pathname);

  // Not logged in
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  // Already logged in
  if (
    token &&
    (pathname === "/login" ||
      pathname === "/register")
  ) {
    switch (role) {
      case "ADMIN":
        return NextResponse.redirect(
          new URL("/admin/dashboard", request.url)
        );

      case "INSTRUCTOR":
        return NextResponse.redirect(
          new URL("/instructor/dashboard", request.url)
        );

      case "STUDENT":
        return NextResponse.redirect(
          new URL("/student/dashboard", request.url)
        );

      default:
        break;
    }
  }

  // Admin Routes
  if (
    pathname.startsWith("/admin") &&
    role !== "ADMIN"
  ) {
    return NextResponse.redirect(
      new URL("/unauthorized", request.url)
    );
  }

  // Instructor Routes
  if (
    pathname.startsWith("/instructor") &&
    role !== "INSTRUCTOR"
  ) {
    return NextResponse.redirect(
      new URL("/unauthorized", request.url)
    );
  }

  // Student Routes
  if (
    pathname.startsWith("/student") &&
    role !== "STUDENT"
  ) {
    return NextResponse.redirect(
      new URL("/unauthorized", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};