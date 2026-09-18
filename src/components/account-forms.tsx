"use client";
import { ActionForm } from "./forms";
import {
  changePassword,
  requestVerification,
  revokeOtherSessions,
  updateAccountProfile,
  verifyEmail,
  requestReset,
  resetPassword,
} from "@/app/account-actions";

export function ProfileDetailsForm({ name }: { name: string }) {
  return (
    <ActionForm action={updateAccountProfile} label="Save profile">
      <label>
        Full name
        <input
          name="name"
          required
          maxLength={120}
          defaultValue={name}
          autoComplete="name"
        />
      </label>
    </ActionForm>
  );
}

export function PasswordForm() {
  return (
    <ActionForm action={changePassword} label="Update password">
      <label>
        Current password
        <input
          type="password"
          name="current"
          autoComplete="current-password"
          required
        />
      </label>
      <label>
        New password
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
        <small>At least 12 characters.</small>
      </label>
      <label>
        Confirm new password
        <input
          type="password"
          name="confirm"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
      </label>
    </ActionForm>
  );
}

export function SessionRevokeForm() {
  return (
    <ActionForm action={revokeOtherSessions} label="Sign out other devices">
      <p>This keeps your current browser signed in.</p>
    </ActionForm>
  );
}

export function VerificationRequest() {
  return (
    <ActionForm action={requestVerification} label="Send verification email">
      <span className="sr-only">Send a verification email to this address.</span>
    </ActionForm>
  );
}
export function VerificationForm({ token }: { token: string }) {
  return (
    <ActionForm action={verifyEmail} label="Verify my email">
      <input type="hidden" name="token" value={token} />
    </ActionForm>
  );
}
export function ResetRequest() {
  return (
    <ActionForm action={requestReset} label="Request password reset">
      <label>
        Email
        <input type="email" name="email" autoComplete="email" required />
      </label>
    </ActionForm>
  );
}
export function ResetForm({ token }: { token: string }) {
  return (
    <ActionForm action={resetPassword} label="Set new password">
      <input type="hidden" name="token" value={token} />
      <label>
        New password
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
        <small>At least 12 characters.</small>
      </label>
      <label>
        Confirm new password
        <input
          type="password"
          name="confirm"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
      </label>
    </ActionForm>
  );
}
