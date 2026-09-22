"use client";

import { ActionForm } from "@/components/forms";
import {
  deleteSpace,
  leaveSpace,
  revokeSpaceInvite,
  transferSpaceOwnership,
  updateSpace,
} from "@/app/actions";

export function SpaceDetailsForm({
  spaceId,
  name,
  kind,
}: {
  spaceId: string;
  name: string;
  kind: string;
}) {
  return (
    <ActionForm action={updateSpace} className="settings-form" label="Save space details">
      <input type="hidden" name="spaceId" value={spaceId} />
      <label>
        Space name
        <input name="name" required maxLength={120} defaultValue={name} />
      </label>
      <label>
        Space type
        <select name="kind" defaultValue={kind}>
          <option value="FAMILY">Family</option>
          <option value="PERSONAL">Personal</option>
          <option value="COMPANY">Company / Academy</option>
        </select>
      </label>
    </ActionForm>
  );
}

export function LeaveSpaceForm({ spaceId }: { spaceId: string }) {
  return (
    <ActionForm
      action={leaveSpace}
      label="Leave this space"
      confirm="Leave this space? You will lose access until someone invites you again."
    >
      <input type="hidden" name="spaceId" value={spaceId} />
      <p>Events stay with the space. You can be invited back later.</p>
    </ActionForm>
  );
}

export function DeleteSpaceForm({
  spaceId,
  name,
}: {
  spaceId: string;
  name: string;
}) {
  return (
    <ActionForm
      action={deleteSpace}
      label="Delete this space"
      confirm={`Delete "${name}" and all of its celebrations? This cannot be undone.`}
    >
      <input type="hidden" name="spaceId" value={spaceId} />
      <label>
        Type {name} to confirm
        <input name="confirmName" required maxLength={120} />
      </label>
    </ActionForm>
  );
}

export function TransferOwnershipForm({
  spaceId,
  members,
}: {
  spaceId: string;
  members: { userId: string; name: string; roleName: string }[];
}) {
  if (!members.length) {
    return (
      <p>Invite another person first. Ownership can only move to a member.</p>
    );
  }
  return (
    <ActionForm
      action={transferSpaceOwnership}
      className="settings-form"
      label="Transfer ownership"
      confirm="You will become an administrator. The new owner will have full control, including billing."
    >
      <input type="hidden" name="spaceId" value={spaceId} />
      <label>
        New owner
        <select name="userId" required defaultValue={members[0].userId}>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.name} · {member.roleName}
            </option>
          ))}
        </select>
      </label>
      <label>
        Type TRANSFER to confirm
        <input name="confirm" required maxLength={20} />
      </label>
    </ActionForm>
  );
}

export function RevokeInviteForm({
  spaceId,
  inviteId,
}: {
  spaceId: string;
  inviteId: string;
}) {
  return (
    <ActionForm
      action={revokeSpaceInvite}
      className="inline-action"
      label="Revoke"
      confirm="Revoke this invitation? The link will stop working."
    >
      <input type="hidden" name="spaceId" value={spaceId} />
      <input type="hidden" name="inviteId" value={inviteId} />
    </ActionForm>
  );
}
