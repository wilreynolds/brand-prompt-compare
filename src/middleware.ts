import { NextRequest, NextResponse } from "next/server";

/**
 * Protects all /api/ routes with a shared secret.
 * The secret must be provided via:
 *   - Authorization: Bearer <secret> header, OR
 *   - "api_secret" cookie (set by the login page)
 *
 * Set API_SECRET in your .env.local to enable protection.
 * If API_SECRET is not set, all requests are allowed (local dev convenience).
 */
export function middleware(request: NextRequest) {
  const secret = process.env.API_SECRET;

  // If no secret configured, skip auth (local dev only)
  if (!secret) {
    return NextResponse.next();
  }

  // Check Authorization header first
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) {
    return NextResponse.next();
  }

  // Check cookie (set by login page for browser usage)
  const cookieSecret = request.cookies.get("api_secret")?.value;
  if (cookieSecret === secret) {
    return NextResponse.next();
  }

  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 }
  );
}

export const config = {
  matcher: "/api/:path*",
};
