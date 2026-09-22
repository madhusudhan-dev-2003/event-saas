import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Shell } from "@/components/shell";
import { InviteForm } from "@/components/forms";
import { Billing } from "@/components/billing";
import {
  DeleteSpaceForm,
  LeaveSpaceForm,
  SpaceDetailsForm,
  TransferOwnershipForm,
} from "@/components/space-settings-forms";
import { PendingInviteList } from "@/components/users-forms";
import { ACCESS_SECTIONS, can, parsePermissions } from "@/lib/permissions";
import { getShellContext } from "@/lib/space-context";
import { seedSpaceRoles } from "@/lib/space-roles";

export default async function SpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, spaces } = await getShellContext(id);
  if (!user) notFound();
  await seedSpaceRoles(id);
  const m = await db.membership.findUnique({
    where: { spaceId_userId: { spaceId: id, userId: user.id } },
    include: {
      role: true,
      space: {
        include: {
          subscription: true,
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              role: true,
            },
            orderBy: { user: { name: "asc" } },
          },
          roles: {
            include: { _count: { select: { members: true } } },
            orderBy: [{ isSystem: "desc" }, { name: "asc" }],
          },
          invites: {
            where: {
              acceptedAt: null,
              revokedAt: null,
              expiresAt: { gt: new Date() },
            },
            include: { role: true },
            orderBy: { expiresAt: "desc" },
          },
          _count: { select: { events: true, members: true } },
        },
      },
    },
  });
  if (!m) notFound();
  const permissions = parsePermissions(m.role.permissions);
  const manageUsers =
    can(permissions, "users.manage") || can(permissions, "users.invite");
  const manageMembers = can(permissions, "users.manage");
  const manageSettings = can(permissions, "settings.manage");
  const manageBilling = can(permissions, "billing.manage");
  const isOwner = m.role.systemKey === "OWNER";
  const owner = m.space.members.find((member) => member.role.systemKey === "OWNER");
  const created = m.space.createdAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const billingStatus = (m.space.subscription?.status || "INACTIVE")
    .toLowerCase()
    .replaceAll("_", " ");
  const accessBySection = ACCESS_SECTIONS.map((section) => {
    const enabled = section.options.filter((option) =>
      can(permissions, option.key),
    );
    return {
      id: section.id,
      title: section.title,
      enabled: enabled.length,
      total: section.options.length,
    };
  }).filter((section) => section.enabled > 0);
  const inviteRoles = m.space.roles
    .filter(
      (r) =>
        r.systemKey !== "OWNER" && (r.systemKey !== "ADMIN" || isOwner),
    )
    .map((r) => ({ id: r.id, name: r.name }));

  return (
    <Shell
      user={user}
      spaces={spaces}
      spaceId={id}
      active="settings"
      title={m.space.name}
      description={`${m.space.kind.toLowerCase()} space · Created ${created} · Owner ${owner?.user.name || "unassigned"} · Your role is ${m.role.name}.`}
    >
      <div className="space-settings">
        <div className="celeb-kpi-grid users-kpi-grid">
          <div className="celeb-kpi">
            <strong>{m.space._count.members}</strong>
            <b>Members</b>
          </div>
          <div className="celeb-kpi">
            <strong>{m.space._count.events}</strong>
            <b>Celebrations</b>
          </div>
          <div className="celeb-kpi">
            <strong>{m.space.roles.length}</strong>
            <b>Roles</b>
          </div>
          <div className="celeb-kpi">
            <strong>{m.space.invites.length}</strong>
            <b>Pending invites</b>
          </div>
          <div className="celeb-kpi">
            <strong>{billingStatus}</strong>
            <b>Billing</b>
          </div>
        </div>
        {manageMembers ? (
          <div className="page-actions">
            <Link className="secondary" href={`/users?space=${id}`}>
              Manage users
            </Link>
          </div>
        ) : null}

        <div className="space-settings-grid">
          <section id="space-details" className="panel">
            <h2>Space details</h2>
            {manageSettings ? (
              <>
                <p>Name and type apply to this space only.</p>
                <SpaceDetailsForm
                  spaceId={id}
                  name={m.space.name}
                  kind={m.space.kind}
                />
              </>
            ) : (
              <p>
                {m.space.name} is a {m.space.kind.toLowerCase()} space. Ask an
                owner or admin if you need this changed.
              </p>
            )}
          </section>

          <section className="panel">
            <h2>Your access</h2>
            <p>
              Billing stays with the owner. Module access is edited on Users.
            </p>
            <ul className="settings-access-modules">
              {accessBySection.map((section) => (
                <li key={section.id}>
                  <strong>{section.title}</strong>
                  <small>
                    {section.enabled === section.total
                      ? "Full access"
                      : `${section.enabled} of ${section.total}`}
                  </small>
                </li>
              ))}
            </ul>
          </section>

          <section id="space-people" className="panel space-settings-span">
            <div className="space-settings-heading">
              <div>
                <h2>People</h2>
                <p>
                  Membership is limited to this space. Plans are not shared
                  across spaces.
                </p>
              </div>
              {manageMembers && (
                <Link className="secondary" href={`/users?space=${id}`}>
                  Users and roles
                </Link>
              )}
            </div>
            <div className="space-people-grid">
              {m.space.members.map((member) => (
                <div className="account-space-row" key={member.userId}>
                  <span className="users-avatar">
                    {member.user.name.charAt(0)}
                  </span>
                  <span>
                    <strong>
                      {member.user.name}
                      {member.userId === user.id ? " (you)" : ""}
                    </strong>
                    <small>
                      {manageMembers ? member.user.email : member.role.name} ·{" "}
                      {member.role.name}
                    </small>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section id="space-roles" className="panel">
            <h2>Roles</h2>
            <p>
              System roles stay consistent. Custom roles are cloned when a
              person’s modules change.
            </p>
            <div className="space-role-grid">
              {m.space.roles.map((role) => (
                <div className="account-space-row" key={role.id}>
                  <span>
                    <strong>{role.name}</strong>
                    <small>
                      {role.isSystem ? "System" : "Custom"} ·{" "}
                      {role._count.members} member
                      {role._count.members === 1 ? "" : "s"}
                    </small>
                  </span>
                </div>
              ))}
            </div>
          </section>

          {manageUsers && (
            <section id="space-invites" className="panel">
              <h2>Invites</h2>
              <p>Create a private link. The app does not send email.</p>
              <InviteForm spaceId={id} roles={inviteRoles} />
              <PendingInviteList
                spaceId={id}
                invites={m.space.invites.map((invite) => ({
                  id: invite.id,
                  email: invite.email,
                  roleId: invite.roleId,
                  roleName: invite.role.name,
                  expiresAt: invite.expiresAt.toISOString(),
                }))}
                roles={inviteRoles}
              />
            </section>
          )}

          {manageBilling && (
            <div id="space-billing">
              <Billing
                spaceId={id}
                configured={
                  !!(
                    process.env.STRIPE_SECRET_KEY &&
                    process.env.STRIPE_WEBHOOK_SECRET &&
                    (m.space.kind === "COMPANY"
                      ? process.env.STRIPE_COMPANY_PRICE_ID
                      : process.env.STRIPE_FAMILY_PRICE_ID)
                  )
                }
                hasCustomer={!!m.space.subscription?.customerId}
                status={m.space.subscription?.status || "INACTIVE"}
              />
            </div>
          )}

          {isOwner ? (
            <section id="space-ownership" className="panel">
              <h2>Transfer ownership</h2>
              <p>
                The new owner receives billing and full control. You become an
                administrator.
              </p>
              <TransferOwnershipForm
                spaceId={id}
                members={m.space.members
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
              <LeaveSpaceForm spaceId={id} />
            </section>
          )}

          {isOwner && (
            <section className="panel account-danger space-settings-span">
              <h2>Delete space</h2>
              <p>
                This removes the space, its memberships, and its celebrations.
                Personal user accounts are kept.
              </p>
              <DeleteSpaceForm spaceId={id} name={m.space.name} />
            </section>
          )}
        </div>
      </div>
    </Shell>
  );
}
