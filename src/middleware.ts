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
  "/portrait",
  "/achievements",
];

/** Routes that are public (no auth needed) */
const PUBLIC_ROUTES = ["/auth", "/privacy", "/intro"];

/** Session cookie name — must match src/lib/auth.ts */
const SESSION_COOKIE = "secondme_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow static assets, API routes, and Next.js internals
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/images/")
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE);

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // If protected route and no session → redirect to /auth
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
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image  (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
