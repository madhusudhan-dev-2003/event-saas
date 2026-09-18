import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const fromQuery = request.nextUrl.searchParams.get("space");
  const spaceMatch = request.nextUrl.pathname.match(/^\/spaces\/([^/]+)/);
  const fromPath =
    spaceMatch && spaceMatch[1] !== "new" ? spaceMatch[1] : null;
  const space = fromQuery || fromPath;
  const response = NextResponse.next();
  if (space) {
    response.cookies.set("utsava-space", space, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|covers/).*)"],
};
