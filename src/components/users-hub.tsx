"use client";

import { useMemo, useState } from "react";
import {
  CircleCheck,
  ClipboardList,
  Pencil,
  Plus,
  Search,
  Users,
} from "@/components/icons";
import {
  CreateRoleForm,
  DeleteRoleForm,
  EditMemberForm,
  EditRoleForm,
  InviteUserForm,
} from "@/components/users-forms";
import { RemoveMember } from "@/components/forms";
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

type Invite = { id: string; email: string; roleName: string };

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function roleBadgeClass(systemKey: string | null) {
  if (systemKey === "OWNER") return "role-badge role-badge-owner";
  if (systemKey === "ADMIN") return "role-badge role-badge-admin";
  if (systemKey === "EDITOR") return "role-badge role-badge-editor";
  if (systemKey === "VIEWER") return "role-badge role-badge-viewer";
  return "role-badge";
}

export function UsersHub({
  spaceId,
  manage,
  isOwner,
  members,
  roles,
  invites,
  assignableRoles,
}: {
  spaceId: string;
  manage: boolean;
  isOwner: boolean;
  members: Member[];
  roles: Role[];
  invites: Invite[];
  assignableRoles: Role[];
}) {
  const [roleFilter, setRoleFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [manageRolesOpen, setManageRolesOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const closeInvite = () => setInviteOpen(false);

  const stats = useMemo(() => {
    const admins = members.filter(
      (member) => member.systemKey === "OWNER" || member.systemKey === "ADMIN",
    ).length;
    return {
      total: members.length,
      admins,
      roles: roles.length,
      pending: invites.length,
    };
  }, [members, roles, invites]);

  const filtered = members.filter((member) => {
    const q = query.trim().toLowerCase();
    const matchesQ =
      !q ||
      member.name.toLowerCase().includes(q) ||
      member.email.toLowerCase().includes(q) ||
      member.roleName.toLowerCase().includes(q);
    const matchesRole = roleFilter === "all" || member.roleId === roleFilter;
    return matchesQ && matchesRole;
  });

  const inviteRoles = assignableRoles.filter(
    (role) => role.systemKey !== "ADMIN" || isOwner,
  );

  return (
    <div className="users-hub">
      <header className="page-header-bar">
        <div>
          <h1>Users</h1>
          <p>People, roles, and module access for this space only.</p>
        </div>
        {manage && (
          <div className="users-hero-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => setManageRolesOpen(true)}
            >
              Manage roles
            </button>
            <button
              type="button"
              className="btn-add"
              onClick={() => setInviteOpen(true)}
            >
              <Plus size={16} /> Add user
            </button>
          </div>
        )}
      </header>

      <div className="celeb-kpi-grid users-kpi-grid">
        <div className="celeb-kpi">
          <span className="celeb-kpi-icon is-rose">
            <Users size={18} />
          </span>
          <b>Total users</b>
          <strong>{stats.total}</strong>
        </div>
        <div className="celeb-kpi">
          <span className="celeb-kpi-icon is-peach">
            <CircleCheck size={18} />
          </span>
          <b>Admins</b>
          <strong>{stats.admins}</strong>
        </div>
        <div className="celeb-kpi">
          <span className="celeb-kpi-icon is-sage">
            <ClipboardList size={18} />
          </span>
          <b>Roles</b>
          <strong>{stats.roles}</strong>
        </div>
        <div className="celeb-kpi">
          <span className="celeb-kpi-icon is-sky">
            <Users size={18} />
          </span>
          <b>Pending invites</b>
          <strong>{stats.pending}</strong>
        </div>
      </div>

      <div className="users-toolbar">
        <div className="role-tabs">
          <button
            type="button"
            className={roleFilter === "all" ? "role-tab active" : "role-tab"}
            onClick={() => setRoleFilter("all")}
          >
            All
          </button>
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              className={roleFilter === role.id ? "role-tab active" : "role-tab"}
              onClick={() => setRoleFilter(role.id)}
            >
              {role.name}
            </button>
          ))}
        </div>
        <div className="users-toolbar-right">
          <div className="search-box users-search">
            <Search size={15} />
            <input
              type="search"
              placeholder="Search users..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search users"
            />
          </div>
          {manage && (
            <button
              type="button"
              className="secondary"
              onClick={() => setRoleOpen(true)}
            >
              <Plus size={14} /> Add role
            </button>
          )}
        </div>
      </div>

      <section className="panel users-list-panel">
        <div className="users-list-head">
          <span>People</span>
          <span>{filtered.length} shown</span>
        </div>
        {filtered.map((member) => {
          const canEdit = manage || member.isYou;
          const canRemove =
            manage &&
            member.systemKey !== "OWNER" &&
            (member.systemKey !== "ADMIN" || isOwner);
          const modules = enabledAccessSections(member.permissions);
          return (
            <div className="user-row" key={member.userId}>
              <span className="users-avatar">{initials(member.name)}</span>
              <div className="user-row-info">
                <strong>
                  {member.name}
                  {member.isYou ? " (you)" : ""}
                </strong>
                <small>{member.email || "Email hidden"}</small>
                {!!modules.length && (
                  <div className="perm-chips">
                    {modules.slice(0, 4).map((label) => (
                      <span className="perm-chip" key={label}>
                        {label}
                      </span>
                    ))}
                    {modules.length > 4 && (
                      <span className="perm-chip">+{modules.length - 4}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="user-row-meta">
                <span className={roleBadgeClass(member.systemKey)}>
                  {member.roleName}
                </span>
                <span className="status-badge">Active</span>
                <div className="user-row-actions">
                  {canEdit && (
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Edit access for ${member.name}`}
                      title="Edit access"
                      onClick={() => setEditMember(member)}
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  {canRemove && (
                    <RemoveMember spaceId={spaceId} userId={member.userId} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {!filtered.length && (
          <p className="empty-inline">No people match this filter.</p>
        )}
      </section>

      {!!invites.length && manage && (
        <section className="panel">
          <h2>Pending invites</h2>
          <div className="invite-chips">
            {invites.map((invite) => (
              <div key={invite.id} className="invite-chip">
                <strong>{invite.email}</strong>
                <span>{invite.roleName}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <Modal
        open={inviteOpen}
        onClose={closeInvite}
        title="Add user"
        compact
      >
        {inviteOpen ? (
          <InviteUserForm
            spaceId={spaceId}
            roles={inviteRoles}
              onDone={closeInvite}
          />
        ) : null}
      </Modal>

      <Modal
        open={!!editMember}
        onClose={() => setEditMember(null)}
        title="Edit access"
        compact
        wide
      >
        {editMember && (
          <EditMemberForm
            spaceId={spaceId}
            member={editMember}
            roles={inviteRoles}
            canChangeRole={
              manage &&
              editMember.systemKey !== "OWNER" &&
              (editMember.systemKey !== "ADMIN" || isOwner)
            }
          />
        )}
      </Modal>

      <Modal
        open={roleOpen}
        onClose={() => setRoleOpen(false)}
        title="Add role"
        compact
        wide
      >
        <p className="modal-lead">
          Name the role and choose which modules people with it can use.
        </p>
        <CreateRoleForm
          spaceId={spaceId}
          onDone={() => setRoleOpen(false)}
        />
      </Modal>

      <Modal
        open={manageRolesOpen}
        onClose={() => setManageRolesOpen(false)}
        title="Manage roles"
        compact
        wide
      >
        <p className="modal-lead">
          Change which modules a role can use. The Owner role stays complete.
          Unused custom roles can be deleted.
        </p>
        <div className="manage-roles-list">
          {roles.map((role) => (
            <div className="manage-role-row" key={role.id}>
              <div>
                <strong>{role.name}</strong>
                <small>
                  {role.isSystem ? "System" : "Custom"} · {role.memberCount}{" "}
                  member{role.memberCount === 1 ? "" : "s"}
                </small>
                <div className="perm-chips">
                  {enabledAccessSections(role.permissions).map((label) => (
                    <span className="perm-chip" key={label}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="user-row-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setManageRolesOpen(false);
                    setEditRole(role);
                  }}
                >
                  {role.systemKey === "OWNER" ? "View" : "Edit"}
                </button>
                {manage && !role.isSystem && (
                  <DeleteRoleForm spaceId={spaceId} roleId={role.id} />
                )}
              </div>
            </div>
          ))}
        </div>
        {manage && (
          <button
            type="button"
            className="btn-add"
            style={{ marginTop: 12 }}
            onClick={() => {
              setManageRolesOpen(false);
              setRoleOpen(true);
            }}
          >
            <Plus size={14} /> Add role
          </button>
        )}
      </Modal>

      <Modal
        open={!!editRole}
        onClose={() => setEditRole(null)}
        title={editRole?.systemKey === "OWNER" ? "View role" : "Edit role"}
        compact
        wide
      >
        {editRole && (
          <EditRoleForm
            spaceId={spaceId}
            role={editRole}
            onDone={() => setEditRole(null)}
          />
        )}
      </Modal>
    </div>
  );
}
