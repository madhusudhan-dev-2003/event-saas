export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export async function sendAppEmail({
  to,
  subject,
  text,
  idempotencyKey,
}: {
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
}) {
  if (!mailConfigured())
    throw new Error("Email delivery is not configured yet.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [to],
      subject,
      text,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      "Email provider could not accept the message. Please try again.",
    );
}
