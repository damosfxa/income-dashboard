import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

const PUBLIC_API_PATHS = ["/api/auth/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const isProtectedPage = pathname.startsWith("/dashboard");

  if (!isApi && !isProtectedPage) return NextResponse.next();
  if (isApi && PUBLIC_API_PATHS.includes(pathname)) return NextResponse.next();

  const token = request.cookies.get("session")?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    if (isApi) {
      return NextResponse.json(
        { success: false, error: "Belum login" },
        { status: 401 }
      );
    }
    // Halaman dashboard: redirect server-side ke /login, bukan JSON error.
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*"],
};
