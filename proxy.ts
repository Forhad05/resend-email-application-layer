import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // 1. Security Shield (CVE-2026-111497 / Brotli Decoder Protection):
  const contentEncoding = request.headers.get("content-encoding")?.toLowerCase();

  if (contentEncoding && (contentEncoding.includes("br") || contentEncoding.includes("brotli"))) {
    return new NextResponse(
      JSON.stringify({ error: "Unsupported Media: Brotli request encoding is disabled." }),
      {
        status: 415,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { pathname } = request.nextUrl;

  // 2. Session Token Detection (Better Auth cookie conventions)
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  const isAuthRoute = pathname === "/login";
  const isDashboardRoute =
    pathname === "/" ||
    pathname.startsWith("/inbox") ||
    pathname.startsWith("/compose") ||
    pathname.startsWith("/contacts") ||
    pathname.startsWith("/templates") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/settings");

  // Protect dashboard routes: redirect unauthenticated requests to /login
  if (isDashboardRoute && !sessionToken) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from /login to /inbox
  if (isAuthRoute && sessionToken) {
    return NextResponse.redirect(new URL("/inbox", request.url));
  }

  return NextResponse.next();
}

// Named export 'middleware' fallback for backwards compatibility
export const middleware = proxy;

export const config = {
  matcher: [
    // Apply to all routes excluding static assets
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

