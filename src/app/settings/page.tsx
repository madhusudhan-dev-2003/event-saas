import Link from "next/link";
import { db } from "@/lib/db";
import { Shell } from "@/components/shell";
import { Billing } from "@/components/billing";
import { InviteForm } from "@/components/forms";
import {
  DeleteSpaceForm,
  LeaveSpaceForm,
  RevokeInviteForm,
  SpaceDetailsForm,
  TransferOwnershipForm,
} from "@/components/space-settings-forms";
import { SettingsAccess } from "@/components/settings-access";
import { can, parsePermissions } from "@/lib/permissions";
import { requireSpaceContext } from "@/lib/space-context";
import { mailConfigured } from "@/lib/mail";
import {
  CircleCheck,
  ClipboardList,
  Sparkles,
  Users,
} from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ space?: string }>;
}) {
  const query = await searchParams;
  const { user, spaces, space, membership } = await requireSpaceContext(
    query.space,
  );
  const permissions = parsePermissions(membership.role.permissions);
  const manageUsers =
    can(permissions, "users.manage") || can(permissions, "users.invite");
  const manageMembers = can(permissions, "users.manage");
  const manageSettings = can(permissions, "settings.manage");
  const manageBilling = can(permissions, "billing.manage");
  const isOwner = membership.role.systemKey === "OWNER";
  const isAdmin = isOwner || manageSettings || manageMembers;

  const [roles, members, invites, eventCount, provider] = await Promise.all([
    db.spaceRole.findMany({
      where: { spaceId: space.id },
      include: { _count: { select: { members: true } } },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    }),
    db.membership.findMany({
      where: { spaceId: space.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        role: true,
      },
      orderBy: { user: { name: "asc" } },
    }),
    manageUsers
      ? db.invitation.findMany({
          where: {
            spaceId: space.id,
            acceptedAt: null,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          include: { role: true },
          orderBy: { expiresAt: "desc" },
        })
      : Promise.resolve([]),
    db.event.count({ where: { spaceId: space.id } }),
    db.provider.findUnique({
      where: { userId: user.id },
      select: { name: true, published: true },
    }),
  ]);

  const subscription = await db.subscription.findUnique({
    where: { spaceId: space.id },
  });
  const owner = members.find((member) => member.role.systemKey === "OWNER");
  const stripeReady = Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      (space.kind === "COMPANY"
        ? process.env.STRIPE_COMPANY_PRICE_ID
        : process.env.STRIPE_FAMILY_PRICE_ID),
  );
  const spaceParam = `?space=${space.id}`;
  const inviteRoles = roles
    .filter(
      (role) =>
        role.systemKey !== "OWNER" && (role.systemKey !== "ADMIN" || isOwner),
    )
    .map((role) => ({ id: role.id, name: role.name }));
  const mappedRoles = roles.map((role) => ({
    id: role.id,
    name: role.name,
    systemKey: role.systemKey,
    isSystem: role.isSystem,
    memberCount: role._count.members,
    permissions: parsePermissions(role.permissions),
  }));
  const mappedMembers = members.map((member) => ({
    userId: member.userId,
    name: member.user.name,
    email: manageMembers || member.userId === user.id ? member.user.email : "",
    roleId: member.roleId,
    roleName: member.role.name,
    systemKey: member.role.systemKey,
    permissions: parsePermissions(member.role.permissions),
    isYou: member.userId === user.id,
  }));

  return (
    <Shell user={user} spaces={spaces} spaceId={space.id} active="settings">
      <div className="admin-settings space-settings">
        <header className="page-header-bar">
          <div>
            <h1>Settings</h1>
            <p>
              {space.name} · {space.kind.toLowerCase()} space · Your role is{" "}
              {membership.role.name}
              {owner ? ` · Owner ${owner.user.name}` : ""}.
            </p>
          </div>
          {manageMembers ? (
            <Link className="btn-add" href={`/users${spaceParam}`}>
              Open users
            </Link>
          ) : null}
        </header>

        <nav className="settings-jump" aria-label="Settings sections">
          <a href="#settings-workspace">Workspace</a>
          <a href="#settings-software">Software</a>
          <a href="#settings-access">Access</a>
          <a href="#settings-people">People</a>
          {manageUsers ? <a href="#settings-invites">Invites</a> : null}
          {manageBilling ? <a href="#space-billing">Billing</a> : null}
          <a href="#settings-account">Your account</a>
        </nav>

        <div className="celeb-kpi-grid users-kpi-grid">
          <div className="celeb-kpi">
            <span className="celeb-kpi-icon is-rose">
              <Users size={18} />
            </span>
            <b>People</b>
            <strong>{members.length}</strong>
          </div>
          <div className="celeb-kpi">
            <span className="celeb-kpi-icon is-peach">
              <Sparkles size={18} />
            </span>
            <b>Celebrations</b>
            <strong>{eventCount}</strong>
          </div>
          <div className="celeb-kpi">
            <span className="celeb-kpi-icon is-sage">
              <ClipboardList size={18} />
            </span>
            <b>Roles</b>
            <strong>{roles.length}</strong>
          </div>
          <div className="celeb-kpi">
            <span className="celeb-kpi-icon is-sky">
              <CircleCheck size={18} />
            </span>
            <b>Pending invites</b>
            <strong>{invites.length}</strong>
          </div>
        </div>

        <div className="space-settings-grid">
          <section id="settings-workspace" className="panel">
            <h2>Workspace</h2>
            {manageSettings ? (
              <>
                <p>Name and type apply only to this space.</p>
                <SpaceDetailsForm
                  spaceId={space.id}
                  name={space.name}
                  kind={space.kind}
                />
              </>
            ) : (
              <p>
                {space.name} is a {space.kind.toLowerCase()} space. An admin can
                rename it.
              </p>
            )}
          </section>

          <section id="settings-software" className="panel">
            <h2>Software status</h2>
            <p>
              These switches are configured for the whole app. They are not
              per-celebration.
            </p>
            <ul className="settings-status-list">
              <li>
                <span className={mailConfigured() ? "status-badge" : "role-badge"}>
                  {mailConfigured() ? "Ready" : "Off"}
                </span>
                <div>
                  <strong>Email delivery</strong>
                  <small>
                    {mailConfigured()
                      ? "Invitation and account mail can send."
                      : "Links are created; you share them yourself."}
                  </small>
                </div>
              </li>
              <li>
                <span className={stripeReady ? "status-badge" : "role-badge"}>
                  {stripeReady ? "Ready" : "Off"}
                </span>
                <div>
                  <strong>Billing</strong>
                  <small>
                    {stripeReady
                      ? "Stripe is configured for this space type."
                      : "Not configured yet. Event data is kept either way."}
                  </small>
                </div>
              </li>
              <li>
                <span
                  className={
                    provider?.published ? "status-badge" : "role-badge"
                  }
                >
                  {provider?.published ? "Live" : provider ? "Draft" : "None"}
                </span>
                <div>
                  <strong>Provider listing</strong>
                  <small>
                    {provider
                      ? provider.name
                      : "No business profile on this account."}
                  </small>
                </div>
              </li>
            </ul>
            {!isAdmin ? (
              <p>
                Ask an administrator if a status here needs to change.
              </p>
            ) : null}
          </section>

          <SettingsAccess
              spaceId={space.id}
              isOwner={isOwner}
              manage={manageMembers}
              members={mappedMembers}
              roles={mappedRoles}
              assignableRoles={mappedRoles.filter(
                (role) => role.systemKey !== "OWNER",
              )}
            />

          {manageUsers ? (
            <section id="settings-invites" className="panel space-settings-span">
              <h2>Invites</h2>
              <p>
                Create a private invitation. Email is optional from Users if
                delivery is configured.
              </p>
              <div className="settings-invite-grid">
                <InviteForm spaceId={space.id} roles={inviteRoles} />
                <div className="settings-invite-pending">
                  <h3>Pending</h3>
                  {invites.length ? (
                    <div className="invite-manage-list">
                      {invites.map((invite) => (
                        <div className="invite-manage-row" key={invite.id}>
                          <span>
                            <strong>{invite.email}</strong>
                            <small>
                              {invite.role.name} · expires{" "}
                              {invite.expiresAt.toLocaleDateString("en-GB")}
                            </small>
                          </span>
                          <RevokeInviteForm
                            spaceId={space.id}
                            inviteId={invite.id}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-inline">No pending invitations.</p>
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {manageBilling ? (
            <div id="space-billing" className="space-settings-span">
              <Billing
                spaceId={space.id}
                configured={stripeReady}
                hasCustomer={!!subscription?.customerId}
                status={subscription?.status || "INACTIVE"}
                compact
              />
            </div>
          ) : null}

          <section id="settings-account" className="panel">
            <h2>Your account</h2>
            <p>Profile, password, sessions, and email verification.</p>
            <div className="guide-jump">
              <Link href={`/account${spaceParam}`}>Account</Link>
              <Link href={`/providers${spaceParam}&manage=1`}>
                Provider profile
              </Link>
              <Link href={`/help${spaceParam}`}>Planning guide</Link>
            </div>
          </section>

          {isOwner ? (
            <section id="space-ownership" className="panel">
              <h2>Transfer ownership</h2>
              <p>
                The new owner receives billing and full control. You become an
                administrator.
              </p>
              <TransferOwnershipForm
                spaceId={space.id}
                members={members
                  .filter((member) => member.userId !== user.id)
                  .map((member) => ({
                    userId: member.userId,
                    name: member.user.name,
                    roleName: member.role.name,
                  }))}
              />
            </section>
          ) : (
            <section id="space-leave" className="panel account-danger">
              <h2>Leave space</h2>
              <LeaveSpaceForm spaceId={space.id} />
            </section>
          )}

          {isOwner ? (
            <section className="panel account-danger space-settings-span">
              <h2>Delete space</h2>
              <p>
                This removes the space, memberships, and celebrations. Personal
                accounts are kept.
              </p>
              <DeleteSpaceForm spaceId={space.id} name={space.name} />
            </section>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}
