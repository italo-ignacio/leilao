import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthOrigin, getAuthSecret } from "./lib/auth-policy";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") return NextResponse.next();
  const token = await getToken({
    req: request,
    secret: getAuthSecret(),
    secureCookie: getAuthOrigin().startsWith("https:"),
  });
  if (!token?.sub || token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/admin/login", getAuthOrigin()));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
