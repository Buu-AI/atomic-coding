import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isDevAuthBypassEnabled } from "@/lib/dev-auth";

const PUBLIC_ROUTE_PATTERNS = [
  /^\/$/,
  /^\/login(?:\/.*)?$/,
  /^\/api\/.*$/,
  /^\/play\/.*$/,
  /^\/game-player\.html$/,
  /^\/games\/[^/]+\/board$/,
  /^\/architecture$/,
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

export default function proxy(request: NextRequest) {
  if (isDevAuthBypassEnabled(request.nextUrl.hostname)) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const privyToken = request.cookies.get("privy-token")?.value;
  if (!privyToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
