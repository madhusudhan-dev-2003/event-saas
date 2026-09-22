"use client";
import { useActionState, useEffect } from "react";
import { ActionForm } from "./forms";
import {
  saveProvider,
  requestQuote,
  replyQuote,
  manageQuote,
} from "@/app/provider-actions";

export const PROVIDER_CATEGORIES = [
  "Photography",
  "Videography",
  "Catering",
  "Cake",
  "Decor",
  "Venue",
  "Florist",
  "Makeup",
  "Mehndi",
  "Music",
  "DJ",
  "Lighting",
  "Invites",
  "Transport",
  "Priest / officiant",
  "Tailoring",
];

export function ProviderForm({
  profile,
  emailVerified,
  onDone,
}: {
  profile?: {
    name: string;
    category: string;
    location: string;
    description: string;
    contact: string;
    published: boolean;
  } | null;
  emailVerified?: boolean;
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState(saveProvider, {});

  useEffect(() => {
    if (!state.success) return;
    const timer = window.setTimeout(() => onDone?.(), 1400);
    return () => window.clearTimeout(timer);
  }, [state.success, onDone]);

  return (
    <form action={action} className="stack-form">
      <p className="modal-lead">
        This listing is yours. It appears in the directory only after you
        publish it, and only then is the business contact visible to others.
      </p>
      <label>
        Business / provider name
        <input
          name="name"
          defaultValue={profile?.name}
          required
          maxLength={120}
        />
      </label>
      <label>
        Main service
        <input
          name="category"
          defaultValue={profile?.category}
          required
          maxLength={80}
          list="provider-category-options"
          placeholder="Photography, catering, decor…"
        />
        <datalist id="provider-category-options">
          {PROVIDER_CATEGORIES.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </label>
      <label>
        Service area
        <input
          name="location"
          defaultValue={profile?.location}
          maxLength={160}
          placeholder="City or region you cover"
        />
      </label>
      <label>
        About your service
        <textarea
          name="description"
          defaultValue={profile?.description}
          maxLength={2000}
          rows={4}
        />
      </label>
      <label>
        Public business contact
        <input
          name="contact"
          defaultValue={profile?.contact}
          maxLength={254}
          placeholder="Phone or email people can use"
        />
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          name="published"
          defaultChecked={profile?.published}
        />
        <span>Publish this profile in the provider directory</span>
      </label>
      {!emailVerified ? (
        <p className="modal-lead">
          Verify your account email before a listing can be published.
        </p>
      ) : null}
      <button type="submit" className="primary" disabled={pending}>
        {pending ? "Saving..." : "Save provider profile"}
      </button>
      {state.error ? (
        <p className="error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="notice" role="status">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
export function QuoteRequestForm({
  eventId,
  services,
}: {
  eventId: string;
  services: { id: string; category: string }[];
}) {
  return (
    <ActionForm action={requestQuote} label="Create a private quote link">
      <input type="hidden" name="eventId" value={eventId} />
      <label>
        Service
        <select name="serviceId">
          {services.map((s) => (
            <option value={s.id} key={s.id}>
              {s.category}
            </option>
          ))}
        </select>
      </label>
      <label>
        Provider name
        <input name="providerName" required maxLength={120} />
      </label>
      <label>
        Brief to share
        <textarea
          name="brief"
          required
          maxLength={2000}
          placeholder="Write only what this provider needs to quote: scope, date, location, quantities and preferences."
        />
        <small>
          This exact brief will be visible to anyone holding the private link.
          Other planner data stays private.
        </small>
      </label>
    </ActionForm>
  );
}
export function QuoteReplyForm({
  token,
  currency,
  version,
  quote,
  reply,
}: {
  token: string;
  currency: string;
  version: number;
  quote: number | null;
  reply: string;
}) {
  return (
    <ActionForm action={replyQuote} label="Send my quote">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="version" value={version} />
      <label>
        Quote ({currency})
        <input
          name="quote"
          type="number"
          min={0}
          step="0.01"
          defaultValue={quote === null ? "" : quote / 100}
          required
        />
      </label>
      <label>
        Availability
        <select name="availability">
          <option value="AVAILABLE">Available for this request</option>
          <option value="UNAVAILABLE">Unavailable</option>
        </select>
      </label>
      <label>
        What is included?
        <textarea name="reply" defaultValue={reply} maxLength={2000} />
      </label>
    </ActionForm>
  );
}
export function QuoteManageForm({
  id,
  action,
}: {
  id: string;
  action: "import" | "revoke";
}) {
  return (
    <ActionForm
      action={manageQuote}
      label={action === "import" ? "Add to vendor comparison" : "Revoke link"}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
    </ActionForm>
  );
}
