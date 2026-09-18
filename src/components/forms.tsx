"use client";
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  authenticate,
  createSpace,
  createEvent,
  createInvitation,
  acceptInvitation,
  removeMember,
  createGuestLink,
  rsvp,
} from "@/app/actions";
import { occasions } from "@/lib/planning";
import { Copy, ExternalLink } from "@/components/icons";
type State = { error?: string; success?: string; path?: string };
type Action = (state: State, form: FormData) => Promise<State>;
export function ActionForm({
  action,
  children,
  label,
  className = "",
  buttonClass = "primary",
  confirm,
}: {
  action: Action;
  children: React.ReactNode;
  label: string;
  className?: string;
  buttonClass?: string;
  confirm?: string;
}) {
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form
      action={submit}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <fieldset disabled={pending}>
        {children}
        <button className={buttonClass} disabled={pending}>
          {pending ? "Please wait" : label}
        </button>
      </fieldset>
      {state.error && (
        <p role="alert" className="error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="notice">
          {state.success}
        </p>
      )}
      {state.path && (
        <label className="share-link">
          Private link
          <input
            readOnly
            value={
              typeof window !== "undefined"
                ? `${window.location.origin}${state.path}`
                : state.path
            }
            onFocus={(e) => e.target.select()}
          />
          <small>
            Select and copy this link. Only share it with the intended
            recipient.
          </small>
        </label>
      )}
    </form>
  );
}
export function AuthForm({ invite = "" }: { invite?: string }) {
  const [register, setRegister] = useState(false);
  return (
    <>
      <ActionForm
        action={authenticate}
        label={register ? "Create my account" : "Sign in"}
        key={String(register)}
      >
        <input
          type="hidden"
          name="mode"
          value={register ? "register" : "login"}
        />
        <input type="hidden" name="invite" value={invite} />
        {register && (
          <label>
            Your name
            <input name="name" required maxLength={120} autoComplete="name" />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            name="email"
            required
            maxLength={254}
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete={register ? "new-password" : "current-password"}
          />
          <small>At least 12 characters.</small>
        </label>
      </ActionForm>
      <button className="text-button" onClick={() => setRegister(!register)}>
        {register
          ? "Already have an account? Sign in"
          : "New here? Create an account"}
      </button>
      {!register && (
        <p>
          <Link className="text-button" href="/account/reset">
            Forgot your password?
          </Link>
        </p>
      )}
    </>
  );
}
export function SpaceForm() {
  return (
    <ActionForm action={createSpace} label="Create space">
      <label>
        Space name
        <input name="name" required maxLength={120} placeholder="Our family" />
      </label>
      <label>
        Space type
        <select name="kind">
          <option value="FAMILY">Family</option>
          <option value="PERSONAL">Personal</option>
          <option value="COMPANY">Company / Academy</option>
        </select>
      </label>
    </ActionForm>
  );
}
export function EventForm({
  spaces,
  initialSpace = "",
  initialTemplate = "birthday",
}: {
  spaces: { id: string; name: string }[];
  initialSpace?: string;
  initialTemplate?: string;
}) {
  const [template, setTemplate] = useState(initialTemplate);
  const [requestKey] = useState(() => crypto.randomUUID());
  return (
    <ActionForm
      action={createEvent}
      label="Create my celebration"
      className="create-form"
    >
      <input type="hidden" name="createKey" value={requestKey} />
      <label>
        Where does this celebration belong?
        <select name="spaceId" defaultValue={initialSpace || spaces[0]?.id}>
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <small>Only people invited to this space can see the plan.</small>
      </label>
      <h2>What are we celebrating?</h2>
      <div className="occasion-grid">
        {occasions.map((o) => (
          <label
            className={`occasion-choice ${o.color} ${template === o.key ? "selected" : ""}`}
            key={o.key}
          >
            <input
              type="radio"
              name="templateKey"
              value={o.key}
              checked={template === o.key}
              onChange={() => setTemplate(o.key)}
            />
            <span className="occasion-glyph">{o.glyph}</span>
            <strong>{o.name}</strong>
            <small>{o.description}</small>
          </label>
        ))}
      </div>
      <label>
        Give it a name
        <input
          name="name"
          required
          maxLength={120}
          placeholder="A celebration to remember"
        />
        <small>
          That is all you need to start. Date, venue and guest list can come
          later.
        </small>
      </label>
    </ActionForm>
  );
}
export function InviteForm({
  spaceId,
  roles,
}: {
  spaceId: string;
  roles: { id: string; name: string }[];
  owner?: boolean;
}) {
  return (
    <ActionForm action={createInvitation} className="settings-form" label="Create invitation link">
      <input type="hidden" name="spaceId" value={spaceId} />
      <label>
        Email
        <input name="email" type="email" required />
      </label>
      <label>
        Access
        <select name="roleId" required defaultValue={roles[0]?.id || ""}>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
    </ActionForm>
  );
}
export function AcceptForm({ token }: { token: string }) {
  return (
    <ActionForm action={acceptInvitation} label="Accept invitation">
      <input type="hidden" name="token" value={token} />
    </ActionForm>
  );
}
export function RemoveMember({
  spaceId,
  userId,
}: {
  spaceId: string;
  userId: string;
}) {
  return (
    <ActionForm
      action={removeMember}
      className="user-remove-form"
      buttonClass="btn-compact"
      label="Remove access"
      confirm="Remove this person's access to this space? Their personal events will be retained."
    >
      <input type="hidden" name="spaceId" value={spaceId} />
      <input type="hidden" name="userId" value={userId} />
    </ActionForm>
  );
}
export function GuestForm({
  eventId,
  onSuccess,
}: {
  eventId: string;
  onSuccess?: () => void;
}) {
  const [state, submit, pending] = useActionState(createGuestLink, {});
  const [localError, setLocalError] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (state.success && onSuccess) onSuccess();
  }, [state.success, onSuccess]);

  return (
    <form
      action={submit}
      noValidate
      onSubmit={(e) => {
        setLocalError("");
        const form = e.currentTarget;
        const household = String(
          new FormData(form).get("household") ?? "",
        ).trim();
        const maxGuests = Number(new FormData(form).get("maxGuests"));
        if (!household) {
          e.preventDefault();
          setLocalError("Enter a household name.");
          return;
        }
        if (!Number.isFinite(maxGuests) || maxGuests < 1 || maxGuests > 100) {
          e.preventDefault();
          setLocalError("Maximum people must be between 1 and 100.");
        }
      }}
    >
      <fieldset disabled={pending}>
        <input type="hidden" name="eventId" value={eventId} />
        <div className="field-grid">
          <label>
            Household name
            <input name="household" maxLength={120} />
          </label>
          <label>
            Maximum people
            <input
              name="maxGuests"
              type="number"
              min={1}
              max={100}
              defaultValue={1}
            />
          </label>
          <label>
            Contact (phone or email)
            <input name="contact" maxLength={160} placeholder="Optional" />
          </label>
          <label>
            Group / side
            <select name="side" defaultValue="">
              <option value="">Not set</option>
              <option value="Family">Family</option>
              <option value="Friends">Friends</option>
              <option value="Work">Work</option>
              <option value="Other">Other</option>
            </select>
          </label>
        </div>
        <label>
          Dietary needs
          <input name="dietary" maxLength={500} placeholder="Optional" />
        </label>
        <label>
          Notes
          <textarea
            name="notes"
            maxLength={500}
            rows={2}
            placeholder="Seating preference, arrival notes, etc."
          />
        </label>
        <div className="modal-actions">
          <button type="submit" className="primary" disabled={pending}>
            {pending ? "Creating link" : "Create private RSVP link"}
          </button>
        </div>
      </fieldset>
      {(localError || state.error) && (
        <p role="alert" className="error">
          {localError || state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="notice">
          {state.success}
        </p>
      )}
      {state.path && (
        <div className="share-link">
          <label>
            Private RSVP link
            <input
              readOnly
              value={origin ? `${origin}${state.path}` : state.path}
              onFocus={(e) => e.target.select()}
            />
          </label>
          <div className="guest-link-actions">
            <button
              type="button"
              className="secondary"
              onClick={async () => {
                const href = origin
                  ? `${origin}${state.path}`
                  : state.path ?? "";
                try {
                  await navigator.clipboard.writeText(href);
                } catch {
                  /* input remains selectable */
                }
              }}
            >
              <Copy size={14} />
              Copy link
            </button>
            <a
              className="secondary"
              href={state.path}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={14} />
              Open link
            </a>
          </div>
          <small>
            Share this link only with that household. Guests do not need an
            account.
          </small>
        </div>
      )}
    </form>
  );
}
export function RsvpForm({
  token,
  maxGuests,
  response,
  attending,
  dietary,
}: {
  token: string;
  maxGuests: number;
  response: string;
  attending: number;
  dietary: string;
}) {
  return (
    <ActionForm action={rsvp} label="Save my response">
      <input type="hidden" name="token" value={token} />
      <label>
        Will you join us?
        <select
          name="response"
          defaultValue={response === "PENDING" ? "YES" : response}
        >
          <option value="YES">Joyfully attending</option>
          <option value="NO">Unable to attend</option>
          <option value="MAYBE">Still deciding</option>
        </select>
      </label>
      <label>
        Number attending
        <input
          type="number"
          name="attending"
          min={0}
          max={maxGuests}
          defaultValue={attending || 1}
        />
        <small>Your invitation is for up to {maxGuests} people.</small>
      </label>
      <label>
        Dietary needs
        <textarea name="dietary" maxLength={500} defaultValue={dietary} />
      </label>
    </ActionForm>
  );
}
