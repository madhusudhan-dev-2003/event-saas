import nodemailer from "nodemailer";

export function envValue(name: string) {
  return (process.env[name] || "").trim().replace(/^["']|["']$/g, "").trim();
}

function smtpConfigured() {
  return Boolean(
    envValue("SMTP_HOST") &&
      envValue("SMTP_USER") &&
      envValue("SMTP_PASS") &&
      envValue("MAIL_FROM"),
  );
}

function resendConfigured() {
  return Boolean(envValue("RESEND_API_KEY") && envValue("MAIL_FROM"));
}

export function mailConfigured() {
  return smtpConfigured() || resendConfigured();
}

function mailError(error: unknown) {
  console.error("[mail]", error);
  const detail =
    error instanceof Error
      ? error.message.replace(/\s+/g, " ").slice(0, 180)
      : "";
  if (detail && !/pass|secret|apikey|authorization/i.test(detail)) {
    return new Error(`Email could not be sent: ${detail}`);
  }
  return new Error(
    "Email could not be sent. Check SMTP host, port, and MAIL_FROM.",
  );
}

async function sendViaSmtp({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  const host = envValue("SMTP_HOST");
  const port = Number(envValue("SMTP_PORT") || "587");
  const secureFlag = envValue("SMTP_SECURE").toLowerCase();
  const secure =
    secureFlag === "true" ||
    secureFlag === "1" ||
    secureFlag === "yes" ||
    (secureFlag !== "false" &&
      secureFlag !== "0" &&
      secureFlag !== "no" &&
      secureFlag !== "off" &&
      port === 465);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure && port === 587,
    auth: {
      user: envValue("SMTP_USER"),
      pass: envValue("SMTP_PASS"),
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
  });
  await transporter.sendMail({
    from: envValue("MAIL_FROM"),
    to,
    subject,
    text,
  });
}

async function sendViaResend({
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
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${envValue("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: envValue("MAIL_FROM"),
      to: [to],
      subject,
      text,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(
      body?.message ||
        "Email provider could not accept the message. Please try again.",
    );
  }
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
  try {
    if (smtpConfigured()) {
      await sendViaSmtp({ to, subject, text });
      return;
    }
    await sendViaResend({ to, subject, text, idempotencyKey });
  } catch (error) {
    throw mailError(error);
  }
}
