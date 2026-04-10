import { NextRequest, NextResponse } from "next/server";

const publicPaths = ["/login", "/register", "/"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes handle their own auth (Bearer tokens)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("session_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
