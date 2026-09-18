"use server";
import { z } from "zod";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { requireUser, limit } from "@/lib/auth";
import { token, hashToken, passwordHash, verifyPassword } from "@/lib/security";
import { appUrl } from "@/lib/stripe";
import { revalidatePath } from "next/cache";
type State = { error?: string; success?: string };
async function sendAccountLink(
  userId: string,
  email: string,
  purpose: "VERIFY" | "RESET",
) {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM)
    throw new Error("Email delivery is not configured yet.");
  const raw = token();
  const url = `${appUrl()}/account/${purpose === "VERIFY" ? "verify" : "reset"}/${raw}`;
  const hash = hashToken(raw);
  await db.accountToken.create({
    data: {
      tokenHash: hash,
      userId,
      purpose,
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `account-${hash}`,
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [email],
      subject:
        purpose === "VERIFY"
          ? "Verify your Utsava email"
          : "Reset your Utsava password",
      text: `${purpose === "VERIFY" ? "Verify your email" : "Reset your password"} using this link, valid for one hour:\n\n${url}\n\nIf you did not request this, ignore this message.`,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      "Email provider could not accept the message. Please try again.",
    );
}
export async function requestVerification(): Promise<State> {
  const user = await requireUser();
  try {
    await limit(`verify:${user.id}`, 3, 3600);
    await sendAccountLink(user.id, user.email, "VERIFY");
    return {
      success:
        "Verification email accepted by the mail provider. Check your inbox; delivery may take a moment.",
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Email could not be sent.",
    };
  }
}
export async function verifyEmail(_: State, form: FormData): Promise<State> {
  try {
    const raw = z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(form.get("token"));
    await db.$transaction(async (tx) => {
      const t = await tx.accountToken.findUnique({
        where: { tokenHash: hashToken(raw) },
      });
      if (
        !t ||
        t.purpose !== "VERIFY" ||
        t.consumedAt ||
        t.expiresAt <= new Date()
      )
        throw new Error(
          "This verification link has expired or already been used.",
        );
      const result = await tx.accountToken.updateMany({
        where: {
          tokenHash: t.tokenHash,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { consumedAt: new Date() },
      });
      if (!result.count)
        throw new Error("This verification link has already been used.");
      await tx.user.update({
        where: { id: t.userId },
        data: { emailVerifiedAt: new Date() },
      });
    });
    revalidatePath("/account");
    return {
      success:
        "Email verified. You can now accept invitations for this address.",
    };
  } catch {
    return {
      error: "This verification link is invalid, expired or already used.",
    };
  }
}
export async function requestReset(_: State, form: FormData): Promise<State> {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM)
    return {
      error:
        "Password recovery is unavailable until email delivery is configured.",
    };
  try {
    const email = z.email().parse(
      String(form.get("email") || "")
        .trim()
        .toLowerCase(),
    );
    await limit(`reset:${hashToken(email)}`, 3, 3600);
    const user = await db.user.findUnique({ where: { email } });
    if (user) await sendAccountLink(user.id, email, "RESET");
  } catch {
    /* Do not disclose whether an account exists or its provider response. */
  }
  return {
    success:
      "If an account matches this email, a reset link has been requested.",
  };
}
export async function resetPassword(_: State, form: FormData): Promise<State> {
  try {
    const raw = z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(form.get("token"));
    const password = z.string().min(12).max(128).parse(form.get("password"));
    if (password !== form.get("confirm"))
      return { error: "Passwords must match." };
    await db.$transaction(async (tx) => {
      const t = await tx.accountToken.findUnique({
        where: { tokenHash: hashToken(raw) },
      });
      if (
        !t ||
        t.purpose !== "RESET" ||
        t.consumedAt ||
        t.expiresAt <= new Date()
      )
        throw new Error("Invalid token");
      const used = await tx.accountToken.updateMany({
        where: {
          tokenHash: t.tokenHash,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { consumedAt: new Date() },
      });
      if (!used.count) throw new Error("Token already used");
      await tx.user.update({
        where: { id: t.userId },
        data: { passwordHash: passwordHash(password) },
      });
      await tx.session.deleteMany({ where: { userId: t.userId } });
      await tx.accountToken.updateMany({
        where: { userId: t.userId, purpose: "RESET", consumedAt: null },
        data: { consumedAt: new Date() },
      });
    });
    return {
      success:
        "Password updated and previous sessions signed out. You can sign in with the new password.",
    };
  } catch {
    return {
      error:
        "This reset link is invalid or expired, or the password does not meet the requirements.",
    };
  }
}

export async function updateAccountProfile(_: State, form: FormData): Promise<State> {
  const user = await requireUser();
  try {
    const name = z.string().trim().min(1, "Enter your name.").max(120).parse(form.get("name"));
    await db.user.update({ where: { id: user.id }, data: { name } });
    revalidatePath("/account");
    revalidatePath("/", "layout");
    return { success: "Profile saved." };
  } catch (e) {
    return {
      error: e instanceof z.ZodError ? e.issues[0].message : "Name could not be saved.",
    };
  }
}

export async function changePassword(_: State, form: FormData): Promise<State> {
  const user = await requireUser();
  try {
    const current = z.string().min(1).parse(form.get("current"));
    const password = z.string().min(12).max(128).parse(form.get("password"));
    if (password !== form.get("confirm")) return { error: "Passwords must match." };
    const record = await db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!verifyPassword(current, record.passwordHash))
      return { error: "Current password did not match." };
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: passwordHash(password) },
    });
    const raw = (await cookies()).get("celebration_session")?.value;
    const keep = raw ? hashToken(raw) : "";
    await db.session.deleteMany({
      where: keep
        ? { userId: user.id, NOT: { tokenHash: keep } }
        : { userId: user.id },
    });
    revalidatePath("/account");
    return { success: "Password updated. Other sessions were signed out." };
  } catch (e) {
    return {
      error:
        e instanceof z.ZodError
          ? "Use a password of at least 12 characters."
          : "Password could not be updated.",
    };
  }
}

export async function revokeOtherSessions(
  _state: State,
  _form: FormData,
): Promise<State> {
  const user = await requireUser();
  try {
    const raw = (await cookies()).get("celebration_session")?.value;
    if (!raw) return { error: "You are not signed in." };
    await db.session.deleteMany({
      where: { userId: user.id, NOT: { tokenHash: hashToken(raw) } },
    });
    revalidatePath("/account");
    return { success: "Other sessions were signed out." };
  } catch {
    return { error: "Sessions could not be updated." };
  }
}
