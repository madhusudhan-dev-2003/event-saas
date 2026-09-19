import { db } from "@/lib/db";
import { hashToken, token } from "@/lib/security";
import { appUrl } from "@/lib/stripe";

export type AccountLinkPurpose = "VERIFY" | "RESET" | "SET";

export async function issueAccountLink(
  userId: string,
  purpose: AccountLinkPurpose,
) {
  const raw = token();
  const path =
    purpose === "VERIFY"
      ? `/account/verify/${raw}`
      : purpose === "SET"
        ? `/account/set/${raw}`
        : `/account/reset/${raw}`;
  const hours = purpose === "SET" ? 7 * 24 : 1;
  if (purpose === "SET") {
    await db.accountToken.updateMany({
      where: { userId, purpose: "SET", consumedAt: null },
      data: { consumedAt: new Date() },
    });
  }
  await db.accountToken.create({
    data: {
      tokenHash: hashToken(raw),
      userId,
      purpose,
      expiresAt: new Date(Date.now() + hours * 3600000),
    },
  });
  return { raw, path, url: `${appUrl()}${path}` };
}
