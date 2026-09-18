import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/security";
import { QuoteReplyForm } from "@/components/provider-forms";
export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function Quote({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();
  const q = await db.serviceRequest.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!q || q.revokedAt || q.expiresAt <= new Date()) notFound();
  return (
    <div className="public-card">
      <p className="eyebrow">A CELEBRATION NEEDS YOUR TALENT</p>
      <h1>{q.category} proposal</h1>
      <h2>Hello, {q.providerName}.</h2>
      <p style={{ whiteSpace: "pre-wrap" }}>{q.brief}</p>
      {q.importedAt ? (
        <p className="notice">
          Your proposal has been added to the organizer’s comparison. Contact
          them directly for changes.
        </p>
      ) : (
        <QuoteReplyForm
          token={token}
          currency={q.currency}
          version={q.version}
          quote={q.quote}
          reply={q.reply}
        />
      )}
      <small>A submitted quote is not a confirmed booking or payment.</small>
    </div>
  );
}
