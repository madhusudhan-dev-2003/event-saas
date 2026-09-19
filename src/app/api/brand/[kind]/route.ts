import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;
  if (kind !== "logo" && kind !== "favicon") {
    return new NextResponse(null, { status: 404 });
  }
  const user = await currentUser();
  if (!user) return new NextResponse(null, { status: 404 });
  const spaceId = new URL(request.url).searchParams.get("space") || "";
  if (!spaceId) return new NextResponse(null, { status: 404 });
  const member = await db.membership.findUnique({
    where: { spaceId_userId: { spaceId, userId: user.id } },
    select: { userId: true },
  });
  if (!member) return new NextResponse(null, { status: 404 });
  const brand = await db.spaceBrand.findUnique({ where: { spaceId } });
  const bytes = kind === "logo" ? brand?.logoBytes : brand?.faviconBytes;
  const mime = kind === "logo" ? brand?.logoMime : brand?.faviconMime;
  if (!bytes || !mime) return new NextResponse(null, { status: 404 });
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "private, max-age=60",
    },
  });
}
