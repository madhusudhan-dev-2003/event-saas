"use client";

import { useActionState, useEffect, useState } from "react";
import {
  addOrInviteUser,
  createSpaceRole,
  deleteSpaceRole,
  saveMemberAccess,
  updateSpaceRole,
} from "@/app/actions";
import { AccessMatrix } from "@/components/access-matrix";
import type { Permission } from "@/lib/permissions";

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
    const toCopy = state.password || url;
    if (toCopy) {
      navigator.clipboard?.writeText(toCopy).then(() => setCopied(true)).catch(() => {});
    }
    if (state.password) return;
    const timer = window.setTimeout(() => onDone?.(), 2200);
    return () => window.clearTimeout(timer);
  }, [state.success, state.path, state.password, onDone]);

  if (state.success) {
    return (
      <div className="invite-success">
        <p className="notice" role="status">
          {state.success}
          {copied && state.password
            ? " The temporary password was copied."
            : copied && link
              ? " The private link was copied."
              : ""}
        </p>
        {state.password ? (
          <label className="share-link">
            Temporary password — share this once
            <input
              readOnly
              value={state.password}
              onFocus={(e) => e.target.select()}
            />
          </label>
        ) : null}
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
          ? "They appear in this space immediately. Email the sign-in details only if you want to."
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
      <label className="check-row">
        <input type="checkbox" name="sendEmail" value="1" />
        <span>
          {mode === "add"
            ? "Email them a sign-in link"
            : "Email them the invitation link"}
        </span>
      </label>
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
