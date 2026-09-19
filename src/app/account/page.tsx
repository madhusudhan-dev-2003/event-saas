import { redirect } from "next/navigation";
import Link from "next/link";
import { hashToken } from "@/lib/security";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { Shell } from "@/components/shell";
import { getShellContext } from "@/lib/space-context";
import {
  PasswordForm,
  ProfileDetailsForm,
  SessionRevokeForm,
  VerificationRequest,
} from "@/components/account-forms";

export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ space?: string }>;
}) {
  const query = await searchParams;
  const { user, spaces, spaceId } = await getShellContext(query.space);
  if (!user) redirect("/login");
  const profile = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { email: true, emailVerifiedAt: true, createdAt: true },
  });
  const memberships = await db.membership.findMany({
    where: { userId: user.id },
    include: { space: true, role: true },
    orderBy: { space: { name: "asc" } },
  });
  const sessions = await db.session.findMany({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: "desc" },
  });
  const raw = (await cookies()).get("celebration_session")?.value;
  const currentHash = raw ? hashToken(raw) : "";
  const provider = await db.provider.findUnique({
    where: { userId: user.id },
    select: { published: true, name: true },
  });
  const joined = profile.createdAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const spaceParam = spaceId ? `?space=${spaceId}` : "";

  return (
    <Shell
      user={user}
      spaces={spaces}
      spaceId={spaceId}
      active="account"
      title={user.name}
      description={`Profile, security, and the spaces you belong to. Joined ${joined}.`}
    >
      <div className="users-hub">
      <div className="celeb-kpi-grid users-kpi-grid">
        <div className="celeb-kpi">
          <b>Spaces</b>
          <strong>{memberships.length}</strong>
        </div>
        <div className="celeb-kpi">
          <b>Devices</b>
          <strong>{sessions.length}</strong>
        </div>
        <div className="celeb-kpi">
          <b>Email</b>
          <strong>{profile.emailVerifiedAt ? "On" : "Off"}</strong>
        </div>
        <div className="celeb-kpi">
          <b>Listing</b>
          <strong>{provider ? 1 : 0}</strong>
        </div>
      </div>
      <nav className="settings-jump" aria-label="Account sections">
        <a href="#account-profile">Profile</a>
        <a href="#account-email">Email</a>
        <a href="#account-password">Password</a>
        <a href="#account-sessions">Devices</a>
        <a href="#account-spaces">Spaces</a>
        <a href="#account-provider">Provider</a>
      </nav>

      <div className="account-grid">
        <section id="account-profile" className="panel">
          <h2>Profile</h2>
          <p>This name appears on invitations, memberships, and the sidebar.</p>
          <ProfileDetailsForm name={user.name} />
        </section>

        <section id="account-email" className="panel">
          <h2>Email</h2>
          <p className="account-email">{profile.email}</p>
          {profile.emailVerifiedAt ? (
            <p className="notice">
              Verified{" "}
              {profile.emailVerifiedAt.toLocaleDateString("en-GB")}. You can
              accept space invitations.
            </p>
          ) : (
            <>
              <p>Verify your address before joining another person’s space.</p>
              <VerificationRequest />
            </>
          )}
        </section>

        <section id="account-password" className="panel">
          <h2>Password</h2>
          <p>Changing your password signs out other devices.</p>
          <PasswordForm />
        </section>

        <section id="account-sessions" className="panel">
          <h2>Signed-in devices</h2>
          <p>
            {sessions.length} active session{sessions.length === 1 ? "" : "s"}.
          </p>
          <ul className="session-list">
            {sessions.map((session) => {
              const current = session.tokenHash === currentHash;
              return (
                <li key={session.tokenHash}>
                  <strong>{current ? "This browser" : "Another device"}</strong>
                  <small>
                    Expires{" "}
                    {session.expiresAt.toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </li>
              );
            })}
          </ul>
          <SessionRevokeForm />
        </section>
      </div>

      <section id="account-spaces" className="panel">
        <h2>Your spaces</h2>
        <p>Access is per space. Switching spaces does not mix their plans.</p>
        <div className="account-space-list">
          {memberships.map((m) => (
            <Link
              key={m.spaceId}
              className="account-space-row"
              href={`/settings?space=${m.spaceId}`}
            >
              <span className="users-avatar">{m.space.name.charAt(0)}</span>
              <span>
                <strong>{m.space.name}</strong>
                <small>
                  {m.space.kind.toLowerCase()} · {m.role.name}
                  {m.spaceId === spaceId ? " · current sidebar" : ""}
                </small>
              </span>
            </Link>
          ))}
          {!memberships.length && <p>You do not belong to a space yet.</p>}
        </div>
        <Link className="secondary" href={`/spaces/new${spaceParam}`}>
          Create another space
        </Link>
      </section>

      <section id="account-provider" className="panel">
        <h2>Provider profile</h2>
        <p>
          {provider
            ? `${provider.name} is ${provider.published ? "published" : "unpublished"} in the directory.`
            : "Optional. Create a business listing if you offer services."}
        </p>
        <Link className="secondary" href={`/providers${spaceParam}${spaceParam ? "&" : "?"}manage=1`}>
          {provider ? "Edit provider profile" : "Create provider profile"}
        </Link>
      </section>
      </div>
    </Shell>
  );
}
