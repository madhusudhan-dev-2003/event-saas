"use client";

import { useActionState, useEffect, useState } from "react";
import {
  addOrInviteUser,
  createSpaceRole,
  deleteSpaceRole,
  saveMemberAccess,
  updateSpaceInvite,
  updateSpaceRole,
} from "@/app/actions";
import { AccessMatrix } from "@/components/access-matrix";
import { Modal } from "@/components/modals";
import { RevokeInviteForm } from "@/components/space-settings-forms";
import type { Permission } from "@/lib/permissions";

export type PendingInvite = {
  id: string;
  email: string;
  roleId: string;
  roleName: string;
  expiresAt: string;
};

function Feedback({
  state,
}: {
  state: { error?: string; success?: string; path?: string };
}) {
  if (state.error) return <p className="error">{state.error}</p>;
  if (state.success)
    return (
      <p className="success">
        {state.success}
        {state.path ? (
          <>
            {" "}
            <a href={state.path}>Open invitation link</a>
          </>
        ) : null}
      </p>
    );
  return null;
}

function toggleKey(selected: string[], key: Permission, enabled: boolean) {
  if (enabled) return selected.includes(key) ? selected : [...selected, key];
  return selected.filter((item) => item !== key);
}

export function InviteUserForm({
  spaceId,
  roles,
  onDone,
}: {
  spaceId: string;
  roles: { id: string; name: string }[];
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState(addOrInviteUser, {});
  const [mode, setMode] = useState<"add" | "invite">("add");
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState("");

  useEffect(() => {
    if (!state.success) return;
    const url = state.path
      ? `${window.location.origin}${state.path}`
      : "";
    setLink(url);
    if (url) {
      navigator.clipboard?.writeText(url).then(() => setCopied(true)).catch(() => {});
    }
    if (state.path) return;
    const timer = window.setTimeout(() => onDone?.(), 2200);
    return () => window.clearTimeout(timer);
  }, [state.success, state.path, onDone]);

  if (state.success) {
    return (
      <div className="invite-success">
        <p className="notice" role="status">
          {state.success}
          {copied && link ? " The link was copied." : ""}
        </p>
        {link ? (
          <label className="share-link">
            {link.includes("/account/set/")
              ? "Set-password link"
              : "Private invitation link"}
            <input readOnly value={link} onFocus={(e) => e.target.select()} />
          </label>
        ) : null}
        <button type="button" className="primary" onClick={() => onDone?.()}>
          Done
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="stack-form">
      <div className="mode-tabs" role="tablist" aria-label="How to add this person">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "add"}
          className={mode === "add" ? "role-tab active" : "role-tab"}
          onClick={() => setMode("add")}
        >
          Add to space
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "invite"}
          className={mode === "invite" ? "role-tab active" : "role-tab"}
          onClick={() => setMode("invite")}
        >
          Invitation link
        </button>
      </div>
      <p className="modal-lead">
        {mode === "add"
          ? "New people get an email to set a password. Existing accounts are added immediately."
          : "Creates a pending invitation. They join after they accept. Email the link only if you want to."}
      </p>
      <input type="hidden" name="spaceId" value={spaceId} />
      <input type="hidden" name="mode" value={mode} />
      {mode === "add" ? (
        <label>
          Name
          <input name="name" required maxLength={120} autoComplete="name" />
        </label>
      ) : null}
      <label>
        Email
        <input name="email" type="email" required maxLength={254} />
      </label>
      <label>
        Role
        <select name="roleId" required defaultValue={roles[0]?.id || ""}>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </label>
      {mode === "invite" ? (
        <label className="check-row">
          <input type="checkbox" name="sendEmail" value="1" />
          <span>Email them the invitation link</span>
        </label>
      ) : (
        <label className="check-row">
          <input type="checkbox" name="sendEmail" value="1" />
          <span>If they already have an account, email them that they were added</span>
        </label>
      )}
      <button
        type="submit"
        className="primary"
        disabled={pending || !roles.length}
      >
        {pending
          ? mode === "add"
            ? "Adding..."
            : "Creating..."
          : mode === "add"
            ? "Add user"
            : "Create invitation link"}
      </button>
      {state.error ? (
        <p className="error" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function EditMemberForm({
  spaceId,
  member,
  roles,
  canChangeRole,
  canSetPassword,
}: {
  spaceId: string;
  member: {
    userId: string;
    name: string;
    email: string;
    roleId: string;
    systemKey: string | null;
    permissions: string[];
  };
  roles: {
    id: string;
    name: string;
    systemKey: string | null;
    permissions: string[];
  }[];
  canChangeRole: boolean;
  canSetPassword?: boolean;
}) {
  const [state, action, pending] = useActionState(saveMemberAccess, {});
  const [roleId, setRoleId] = useState(member.roleId);
  const [selected, setSelected] = useState(member.permissions);
  const locked = member.systemKey === "OWNER" || !canChangeRole;
  const current = roles.find((role) => role.id === roleId);

  return (
    <form action={action} className="stack-form access-form">
      <div className="access-form-scroll">
        <input type="hidden" name="spaceId" value={spaceId} />
        <input type="hidden" name="userId" value={member.userId} />
        <div className="field-grid field-grid-modal">
          <label>
            Full name
            <input
              name="name"
              required
              maxLength={120}
              defaultValue={member.name}
            />
          </label>
          <label>
            Email
            <input type="email" value={member.email || ""} disabled readOnly />
          </label>
        </div>
        {canChangeRole && member.systemKey !== "OWNER" ? (
          <label>
            Role
            <select
              name="roleId"
              required
              value={roleId}
              onChange={(event) => {
                const next = event.target.value;
                setRoleId(next);
                const match = roles.find((role) => role.id === next);
                setSelected(match?.permissions ?? []);
              }}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="roleId" value={member.roleId} />
        )}
        <div className="access-copy">
          <h3>Module access</h3>
          <p>
            {locked
              ? "Owner access includes every module in this space."
              : current?.systemKey
                ? "Changing a module creates a custom role for this person so shared roles stay intact."
                : "These modules apply to this custom role. If others share it, a personal role is created instead."}
          </p>
        </div>
        <AccessMatrix
          selected={selected}
          disabled={locked}
          onToggle={(key, enabled) =>
            setSelected((currentSelected) =>
              toggleKey(currentSelected, key, enabled),
            )
          }
        />
        {canSetPassword ? (
          <div className="access-copy">
            <h3>Password</h3>
            <p>Leave blank to keep their current password. Other devices will be signed out.</p>
            <div className="field-grid field-grid-modal">
              <label>
                New password
                <input
                  type="password"
                  name="password"
                  minLength={6}
                  maxLength={128}
                  autoComplete="new-password"
                />
                <small>At least 6 characters.</small>
              </label>
              <label>
                Confirm password
                <input
                  type="password"
                  name="confirmPassword"
                  minLength={6}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </label>
            </div>
            <label className="check-row">
              <input type="checkbox" name="emailPassword" value="1" />
              <span>Email them the new password</span>
            </label>
          </div>
        ) : null}
      </div>
      <div className="access-form-actions">
        <Feedback state={state} />
        <button type="submit" className="primary" disabled={pending}>
          {pending ? "Saving..." : "Save access"}
        </button>
      </div>
    </form>
  );
}

export function CreateRoleForm({
  spaceId,
  onDone,
}: {
  spaceId: string;
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState(createSpaceRole, {});
  const [selected, setSelected] = useState<string[]>([
    "dashboard.view",
    "events.read",
  ]);
  useEffect(() => {
    if (state.success && onDone) onDone();
  }, [state.success, onDone]);
  return (
    <form action={action} className="stack-form access-form">
      <div className="access-form-scroll">
        <input type="hidden" name="spaceId" value={spaceId} />
        <label>
          Role name
          <input
            name="name"
            required
            maxLength={120}
            placeholder="Coordinator, Front desk, Teacher..."
          />
        </label>
        <AccessMatrix
          selected={selected}
          onToggle={(key, enabled) =>
            setSelected((current) => toggleKey(current, key, enabled))
          }
        />
      </div>
      <div className="access-form-actions">
        <Feedback state={state} />
        <button type="submit" className="primary" disabled={pending}>
          {pending ? "Saving..." : "Add role"}
        </button>
      </div>
    </form>
  );
}

export function EditRoleForm({
  spaceId,
  role,
  onDone,
}: {
  spaceId: string;
  role: {
    id: string;
    name: string;
    isSystem: boolean;
    systemKey: string | null;
    permissions: string[];
  };
  onDone?: () => void;
}) {
  const locked = role.systemKey === "OWNER";
  const [state, action, pending] = useActionState(updateSpaceRole, {});
  const [selected, setSelected] = useState(role.permissions);
  useEffect(() => {
    if (state.success && onDone) onDone();
  }, [state.success, onDone]);
  return (
    <form action={action} className="stack-form access-form">
      <div className="access-form-scroll">
        <input type="hidden" name="spaceId" value={spaceId} />
        <input type="hidden" name="roleId" value={role.id} />
        <label>
          Role name
          <input
            name="name"
            required
            maxLength={120}
            defaultValue={role.name}
            readOnly={role.isSystem}
          />
        </label>
        {locked ? (
          <p className="access-copy">
            Owner access includes every module, including billing. It cannot be
            narrowed.
          </p>
        ) : (
          <p className="access-copy">
            Tick the modules this role can use. Billing stays with the owner.
          </p>
        )}
        <AccessMatrix
          selected={selected}
          disabled={locked}
          onToggle={(key, enabled) =>
            setSelected((current) => toggleKey(current, key, enabled))
          }
        />
      </div>
      <div className="access-form-actions">
        <Feedback state={state} />
        {!locked && (
          <button type="submit" className="primary" disabled={pending}>
            {pending ? "Saving..." : "Save role"}
          </button>
        )}
      </div>
    </form>
  );
}

export function EditInviteForm({
  spaceId,
  invite,
  roles,
  onDone,
}: {
  spaceId: string;
  invite: PendingInvite;
  roles: { id: string; name: string }[];
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState(updateSpaceInvite, {});
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState("");

  useEffect(() => {
    if (!state.success) return;
    const url = state.path ? `${window.location.origin}${state.path}` : "";
    setLink(url);
    if (url) {
      navigator.clipboard?.writeText(url).then(() => setCopied(true)).catch(() => {});
    }
    if (state.path) return;
    const timer = window.setTimeout(() => onDone?.(), 1600);
    return () => window.clearTimeout(timer);
  }, [state.success, state.path, onDone]);

  if (state.success) {
    return (
      <div className="invite-success">
        <p className="notice" role="status">
          {state.success}
          {copied && link ? " The new private link was copied." : ""}
        </p>
        {link ? (
          <label className="share-link">
            Private invitation link
            <input readOnly value={link} onFocus={(e) => e.target.select()} />
          </label>
        ) : null}
        <button type="button" className="primary" onClick={() => onDone?.()}>
          Done
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="spaceId" value={spaceId} />
      <input type="hidden" name="inviteId" value={invite.id} />
      <label>
        Email
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          defaultValue={invite.email}
        />
      </label>
      <label>
        Role
        <select name="roleId" required defaultValue={invite.roleId}>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </label>
      <p className="modal-lead">
        Expires {new Date(invite.expiresAt).toLocaleDateString("en-GB")}. The
        current link keeps working unless you create a new one.
      </p>
      <label className="check-row">
        <input type="checkbox" name="extendExpiry" value="1" />
        <span>Extend expiry by 7 days</span>
      </label>
      <label className="check-row">
        <input type="checkbox" name="newLink" value="1" />
        <span>Create a new invitation link</span>
      </label>
      <label className="check-row">
        <input type="checkbox" name="sendEmail" value="1" />
        <span>Email them the invitation link</span>
      </label>
      <button type="submit" className="primary" disabled={pending || !roles.length}>
        {pending ? "Saving..." : "Save invitation"}
      </button>
      {state.error ? (
        <p className="error" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function PendingInviteList({
  spaceId,
  invites,
  roles,
}: {
  spaceId: string;
  invites: PendingInvite[];
  roles: { id: string; name: string }[];
}) {
  const [editInvite, setEditInvite] = useState<PendingInvite | null>(null);
  if (!invites.length) {
    return <p className="empty-inline">No pending invitations.</p>;
  }
  return (
    <>
      <div className="invite-manage-list">
        {invites.map((invite) => (
          <div className="invite-manage-row" key={invite.id}>
            <span>
              <strong>{invite.email}</strong>
              <small>
                {invite.roleName} · expires{" "}
                {new Date(invite.expiresAt).toLocaleDateString("en-GB")}
              </small>
            </span>
            <div className="invite-manage-actions">
              <button
                type="button"
                className="btn-compact"
                onClick={() => setEditInvite(invite)}
              >
                Edit
              </button>
              <RevokeInviteForm spaceId={spaceId} inviteId={invite.id} />
            </div>
          </div>
        ))}
      </div>
      <Modal
        open={!!editInvite}
        onClose={() => setEditInvite(null)}
        title="Edit invitation"
        compact
      >
        {editInvite ? (
          <EditInviteForm
            spaceId={spaceId}
            invite={editInvite}
            roles={roles}
            onDone={() => setEditInvite(null)}
          />
        ) : null}
      </Modal>
    </>
  );
}

export function DeleteRoleForm({
  spaceId,
  roleId,
}: {
  spaceId: string;
  roleId: string;
}) {
  const [state, action, pending] = useActionState(deleteSpaceRole, {});
  return (
    <form action={action}>
      <input type="hidden" name="spaceId" value={spaceId} />
      <input type="hidden" name="roleId" value={roleId} />
      <button
        type="submit"
        className="btn-compact btn-compact-danger"
        disabled={pending}
        onClick={(e) => {
          if (!confirm("Delete this custom role?")) e.preventDefault();
        }}
      >
        {pending ? "..." : "Delete"}
      </button>
      {state.error && <p className="error">{state.error}</p>}
    </form>
  );
}
