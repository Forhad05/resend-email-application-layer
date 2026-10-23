import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Security Shield (CVE-2026-111497 / Brotli Decoder Protection):
  // Incoming webhooks, API requests, and browser forms never need compressed Brotli request bodies.
  // Rejecting 'Content-Encoding: br' prevents vulnerable native Brotli decompressors from ever touching untrusted input.
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Apply to all API routes and incoming webhooks
    "/api/:path*",
    // Exclude static assets
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

