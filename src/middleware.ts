import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Routes that require authentication */
const PROTECTED_ROUTES = [
  "/discover",
  "/matches",
  "/town",
  "/profile",
  "/settings",
  "/onboarding",
  "/match-start",
];

/** Routes that are public (no auth needed) */
const PUBLIC_ROUTES = ["/auth", "/privacy", "/intro"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("qiubi_session");

  // Check if the route is protected
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Allow public routes and API routes (they handle their own auth)
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // If protected route and no session → redirect to auth
  if (isProtected && !sessionCookie) {
    const authUrl = new URL("/auth", request.url);
    authUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(authUrl);
  }

  // If on auth page and already logged in → redirect to home
  if (pathname.startsWith("/auth") && sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/discover/:path*",
    "/matches/:path*",
    "/town/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/match-start/:path*",
    "/auth/:path*",
  ],
};
