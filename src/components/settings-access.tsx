"use client";

import { useMemo, useState } from "react";
import { usePageSearch } from "@/components/topbar-search";
import {
  CreateRoleForm,
  DeleteRoleForm,
  EditMemberForm,
  EditRoleForm,
} from "@/components/users-forms";
import { Modal } from "@/components/modals";
import { enabledAccessSections } from "@/lib/permissions";

type Role = {
  id: string;
  name: string;
  systemKey: string | null;
  isSystem: boolean;
  memberCount: number;
  permissions: string[];
};

type Member = {
  userId: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  systemKey: string | null;
  permissions: string[];
  isYou: boolean;
};

export function SettingsAccess({
  spaceId,
  isOwner,
  manage,
  members,
  roles,
  assignableRoles,
}: {
  spaceId: string;
  isOwner: boolean;
  manage: boolean;
  members: Member[];
  roles: Role[];
  assignableRoles: Role[];
}) {
  const query = usePageSearch();
  const [roleOpen, setRoleOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const inviteRoles = assignableRoles.filter(
    (role) => role.systemKey !== "ADMIN" || isOwner,
  );
  const visibleRoles = useMemo(
    () =>
      roles.filter(
        (role) =>
          !query ||
          role.name.toLowerCase().includes(query) ||
          (role.systemKey || "").toLowerCase().includes(query),
      ),
    [roles, query],
  );
  const visibleMembers = useMemo(
    () =>
      members.filter(
        (member) =>
          !query ||
          member.name.toLowerCase().includes(query) ||
          member.email.toLowerCase().includes(query) ||
          member.roleName.toLowerCase().includes(query),
      ),
    [members, query],
  );

  return (
    <>
      <section id="settings-access" className="panel">
        <div className="space-settings-heading">
          <div>
            <h2>Access and roles</h2>
            <p>
              Roles decide which modules people can use in this space. Owner
              billing access cannot be granted from here.
            </p>
          </div>
          {manage ? (
            <button
              type="button"
              className="btn-compact"
              onClick={() => setRoleOpen(true)}
            >
              Add role
            </button>
          ) : null}
        </div>
        <div className="settings-role-grid">
          {visibleRoles.map((role) => (
            <article className="settings-role-tile" key={role.id}>
              <header>
                <div>
                  <strong>{role.name}</strong>
                  <small>
                    {role.isSystem ? "System" : "Custom"} · {role.memberCount}{" "}
                    member{role.memberCount === 1 ? "" : "s"}
                  </small>
                </div>
                {manage ? (
                  <button
                    type="button"
                    className="btn-compact"
                    onClick={() => setEditRole(role)}
                  >
                    {role.systemKey === "OWNER" ? "View" : "Edit"}
                  </button>
                ) : null}
              </header>
              <div className="perm-chips">
                {enabledAccessSections(role.permissions)
                  .slice(0, 4)
                  .map((label) => (
                    <span className="perm-chip" key={label}>
                      {label}
                    </span>
                  ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="settings-people" className="panel">
        <h2>People in this space</h2>
        <p>Change a person’s role or modules without leaving Settings.</p>
        <div className="settings-people-list">
          {visibleMembers.map((member) => (
            <div className="settings-person-row" key={member.userId}>
              <span className="users-avatar">
                {member.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className="user-row-info">
                <strong>
                  {member.name}
                  {member.isYou ? " (you)" : ""}
                </strong>
                <small>{member.email || "Email hidden"}</small>
              </div>
              <span
                className={
                  member.systemKey === "OWNER"
                    ? "role-badge role-badge-owner"
                    : member.systemKey === "ADMIN"
                      ? "role-badge role-badge-admin"
                      : member.systemKey === "EDITOR"
                        ? "role-badge role-badge-editor"
                        : member.systemKey === "VIEWER"
                          ? "role-badge role-badge-viewer"
                          : "role-badge"
                }
              >
                {member.roleName}
              </span>
              {manage || member.isYou ? (
                <button
                  type="button"
                  className="btn-compact"
                  onClick={() => setEditMember(member)}
                >
                  Edit access
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <Modal
        open={roleOpen}
        onClose={() => setRoleOpen(false)}
        title="Add role"
        compact
        wide
      >
        <CreateRoleForm spaceId={spaceId} onDone={() => setRoleOpen(false)} />
      </Modal>
      <Modal
        open={!!editRole}
        onClose={() => setEditRole(null)}
        title={editRole?.systemKey === "OWNER" ? "View role" : "Edit role"}
        compact
        wide
      >
        {editRole ? (
          <>
            <EditRoleForm
              spaceId={spaceId}
              role={editRole}
              onDone={() => setEditRole(null)}
            />
            {manage && !editRole.isSystem ? (
              <DeleteRoleForm spaceId={spaceId} roleId={editRole.id} />
            ) : null}
          </>
        ) : null}
      </Modal>
      <Modal
        open={!!editMember}
        onClose={() => setEditMember(null)}
        title="Edit access"
        compact
        wide
      >
        {editMember ? (
          <EditMemberForm
            spaceId={spaceId}
            member={editMember}
            roles={inviteRoles}
            canChangeRole={
              manage &&
              editMember.systemKey !== "OWNER" &&
              (editMember.systemKey !== "ADMIN" || isOwner)
            }
            canSetPassword={
              manage && (isOwner || editMember.systemKey !== "OWNER")
            }
          />
        ) : null}
      </Modal>
    </>
  );
}
