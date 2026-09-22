import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/security";
import { AcceptForm, InviteJoinForm } from "@/components/forms";
import { logout } from "@/app/actions";

export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

export default async function Invite({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await currentUser();
  const invite =
    /^[a-f0-9]{64}$/.test(token)
      ? await db.invitation.findUnique({
          where: { tokenHash: hashToken(token) },
          include: { space: { select: { name: true } }, role: { select: { name: true } } },
        })
      : null;
  const now = new Date();
  const invalid =
    !invite ||
    Boolean(invite.acceptedAt) ||
    Boolean(invite.revokedAt) ||
    invite.expiresAt <= now;
  const account = invite
    ? await db.user.findUnique({
        where: { email: invite.email },
        select: { id: true },
      })
    : null;

  return (
    <div className="public-card">
      <Link href="/login" className="brand">
        ✳ utsava
      </Link>
      {invalid ? (
        <>
          <h1>This invitation is not available.</h1>
          <p>It may have expired, already been used, or the link is incomplete.</p>
          <Link className="primary" href="/login">
            Go to sign in
          </Link>
        </>
      ) : user && user.email !== invite.email ? (
        <>
          <h1>Wrong account</h1>
          <p>
            This invitation is for {invite.email}. You are signed in as{" "}
            {user.email}. Sign out, then open the same link again.
          </p>
          <form action={logout}>
            <button type="submit" className="primary">
              Sign out
            </button>
          </form>
        </>
      ) : user && user.email === invite.email ? (
        <>
          <h1>Join {invite.space.name}.</h1>
          <p>
            You were invited as {invite.role.name}. Accept to add this space to
            your account.
          </p>
          <AcceptForm token={token} />
        </>
      ) : (
        <>
          <h1>
            {account ? "Sign in to join" : "Set a password to join"}{" "}
            {invite.space.name}.
          </h1>
          <p>
            Invitation for {invite.email} as {invite.role.name}.{" "}
            {account
              ? "Enter the password for this email."
              : "Choose a password for this email, then you can open the space."}
          </p>
          <InviteJoinForm
            token={token}
            email={invite.email}
            needsName={!account}
          />
        </>
      )}
    </div>
  );
}
