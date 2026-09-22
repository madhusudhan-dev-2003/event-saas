import { cookies } from "next/headers";
import { db } from "./db";
import { hashToken, token } from "./security";
import { redirect } from "next/navigation";
export async function currentUser() {
  if (!process.env.DATABASE_URL) return null;
  const raw = (await cookies()).get("celebration_session")?.value;
  if (!raw) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return session && session.expiresAt > new Date() ? session.user : null;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
export async function startSession(userId: string) {
  const raw = token();
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await db.session.create({
    data: { userId, tokenHash: hashToken(raw), expiresAt },
  });
  (await cookies()).set("celebration_session", raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}
export async function limit(key: string, max: number, windowSeconds = 60) {
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const result = await db.rateLimit.upsert({
    where: { key: `${key}:${bucket}` },
    create: {
      key: `${key}:${bucket}`,
      expiresAt: new Date((bucket + 1) * windowSeconds * 1000),
    },
    update: { count: { increment: 1 } },
  });
  if (result.count > max)
    throw new Error("Too many attempts. Please try again later.");
}
