import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/security";
import { planSchema } from "@/lib/planning";
import { RsvpForm } from "@/components/forms";
export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function Rsvp({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();
  const invite = await db.guestLink.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { event: { select: { name: true, plan: true } } },
  });
  if (!invite || invite.revokedAt || invite.expiresAt <= new Date()) notFound();
  const plan = planSchema.parse(invite.event.plan);
  return (
    <div className="public-card">
      <span className="public-flower">✳</span>
      <p className="eyebrow">YOU’RE INVITED</p>
      <h1>{invite.event.name}</h1>
      <p>
        {plan.date || "Date to be announced"}
        <br />
        {plan.location || "Location to follow"}
      </p>
      <hr />
      <h2>Hello, {invite.household}.</h2>
      <p>We’d love to celebrate with you.</p>
      <RsvpForm
        token={token}
        maxGuests={invite.maxGuests}
        response={invite.response}
        attending={invite.attending}
        dietary={invite.dietary}
      />
    </div>
  );
}
