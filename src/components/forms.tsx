"use client";
import { useActionState, useEffect, useState } from "react";
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
import { requestReset } from "@/app/account-actions";
import { occasions } from "@/lib/planning";
import { celebrationCover } from "@/lib/celebration-board";
import { CalendarDays, Copy, ExternalLink, MapPin } from "@/components/icons";
type State = { error?: string; success?: string; path?: string };
type Action = (state: State, form: FormData) => Promise<State>;
export function ActionForm({
  action,
  children,
  label,
  className = "",
  buttonClass = "primary",
  confirm,
  hideButton = false,
}: {
  action: Action;
  children: React.ReactNode;
  label: string;
  className?: string;
  buttonClass?: string;
  confirm?: string;
  hideButton?: boolean;
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
        {!hideButton && (
          <button className={buttonClass} disabled={pending}>
            {pending ? "Please wait" : label}
          </button>
        )}
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
  const [view, setView] = useState<"login" | "register" | "reset">("login");
  if (view === "reset") {
    return (
      <>
        <p>Enter your registered email. We will send a password reset link.</p>
        <ActionForm action={requestReset} label="Send reset email" key="reset">
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
        </ActionForm>
        <button className="text-button" onClick={() => setView("login")}>
          Back to sign in
        </button>
      </>
    );
  }
  const register = view === "register";
  return (
    <>
      <ActionForm
        action={authenticate}
        label={register ? "Create my account" : "Sign in"}
        key={view}
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
            minLength={6}
            maxLength={128}
            autoComplete={register ? "new-password" : "current-password"}
          />
          <small>At least 6 characters.</small>
        </label>
      </ActionForm>
      <button
        className="text-button"
        onClick={() => setView(register ? "login" : "register")}
      >
        {register
          ? "Already have an account? Sign in"
          : "New here? Create an account"}
      </button>
      {!register && (
        <p>
          <button className="text-button" onClick={() => setView("reset")}>
            Forgot your password? Reset it
          </button>
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
  const known = occasions.some((item) => item.key === initialTemplate)
    ? initialTemplate
    : "birthday";
  const [template, setTemplate] = useState(known);
  const [requestKey] = useState(() => crypto.randomUUID());
  const selected = occasions.find((item) => item.key === template) || occasions[0];
  return (
    <ActionForm
      action={createEvent}
      label="Create celebration"
      className="create-form"
      hideButton
    >
      <input type="hidden" name="createKey" value={requestKey} />
      <div className="create-event-body">
        <div>
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
                <img src={celebrationCover(o.key)} alt="" />
                <strong>{o.name}</strong>
                <small>{o.description}</small>
              </label>
            ))}
          </div>
        </div>
        <aside className="create-event-aside">
          <img
            className="create-event-cover"
            src={celebrationCover(selected.key)}
            alt=""
          />
          <p className="create-event-aside-kicker">{selected.name}</p>
          <label>
            Space
            <select name="spaceId" defaultValue={initialSpace || spaces[0]?.id}>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <small>Only people in this space can see the plan.</small>
          </label>
          <label>
            Celebration name
            <input
              name="name"
              required
              maxLength={120}
              placeholder="Anurag’s birthday"
            />
          </label>
          <div className="create-event-fields">
            <label>
              Date
              <span className="create-event-icon-field">
                <CalendarDays size={15} />
                <input name="date" type="date" required />
              </span>
            </label>
            <label>
              Location
              <span className="create-event-icon-field">
                <MapPin size={15} />
                <input
                  name="location"
                  required
                  maxLength={160}
                  placeholder="Pune"
                />
              </span>
            </label>
          </div>
          <button className="primary" type="submit">
            Create celebration
          </button>
        </aside>
      </div>
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
      <label className="check-row">
        <input type="checkbox" name="sendEmail" value="1" />
        <span>Email them the invitation link</span>
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
