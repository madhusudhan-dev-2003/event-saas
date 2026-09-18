"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Coins,
  Copy,
  Download,
  ExternalLink,
  Link2,
  Settings2,
  Sparkles,
  Users,
} from "@/components/icons";
import { DeleteEventButton } from "@/components/delete-event-button";
import {
  dateChanges,
  modules,
  occasions,
  type Plan,
} from "@/lib/planning";

const CURRENCIES: Plan["currency"][] = [
  "USD",
  "INR",
  "GBP",
  "EUR",
  "CAD",
  "AUD",
];

const MODULE_LABELS: Record<(typeof modules)[number], string> = {
  functions: "Functions",
  seating: "Seating",
  food: "Food",
  rehearsals: "Rehearsals",
  preparation: "Preparation",
};

type SectionId =
  | "basics"
  | "status"
  | "notes"
  | "theme"
  | "privacy"
  | "advanced";

function SettingsSection({
  id,
  title,
  subtitle,
  icon,
  open,
  onToggle,
  children,
}: {
  id: SectionId;
  title: string;
  subtitle: string;
  icon: ReactNode;
  open: boolean;
  onToggle: (id: SectionId) => void;
  children: React.ReactNode;
}) {
  return (
    <section className={`settings-acc${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="settings-acc-trigger"
        aria-expanded={open}
        onClick={() => onToggle(id)}
      >
        <span className="settings-acc-icon">{icon}</span>
        <span>
          <strong>{title}</strong>
          <small>{subtitle}</small>
        </span>
        <ChevronDown
          size={18}
          className={open ? "is-rotated" : undefined}
        />
      </button>
      {open && <div className="settings-acc-body">{children}</div>}
    </section>
  );
}

export function SettingsTab({
  eventId,
  name,
  plan,
  spaceName,
  templateKey,
  proposedDate,
  editable,
  canDelete,
  pending,
  dirty,
  saveStatus,
  onNameChange,
  onUpdate,
  onCurrencyChange,
  onProposeDate,
  onApplyDate,
  onApplyDateOnly,
  onCancelDate,
  onReuse,
  onExport,
  onOpenGuests,
}: {
  eventId: string;
  name: string;
  plan: Plan;
  spaceName: string;
  templateKey: string;
  proposedDate: string | null;
  editable: boolean;
  canDelete: boolean;
  pending: boolean;
  dirty: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onNameChange: (name: string) => void;
  onUpdate: (plan: Plan) => void;
  onCurrencyChange: (currency: Plan["currency"]) => void;
  onProposeDate: (date: string) => void;
  onApplyDate: () => void;
  onApplyDateOnly: () => void;
  onCancelDate: () => void;
  onReuse: () => void;
  onExport: () => void;
  onOpenGuests: () => void;
}) {
  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    basics: true,
    status: false,
    notes: false,
    theme: false,
    privacy: false,
    advanced: false,
  });
  const [copied, setCopied] = useState(false);
  const occasion = occasions.find((item) => item.key === templateKey);
  const workspacePath = `/events/${eventId}`;
  const dateValue = proposedDate ?? plan.date;
  const deadlinePreview =
    proposedDate !== null ? dateChanges(plan, proposedDate) : [];

  const toggle = (id: SectionId) =>
    setOpen((current) => ({ ...current, [id]: !current[id] }));

  const copyWorkspaceLink = async () => {
    const url = `${window.location.origin}${workspacePath}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const saveLabel =
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "error"
        ? "Couldn’t save"
        : saveStatus === "idle" && dirty
          ? "Editing..."
          : "All changes saved automatically";

  return (
    <div className="settings-tab">
      <div className="settings-main">
        <header className="settings-intro">
          <h2>Your event, your way.</h2>
          <p>
            Open a section when you need it. Fields stay tucked away until you
            customize.
          </p>
          {!editable && (
            <p className="notice">
              You can view these settings. Ask an owner if you need to make
              changes.
            </p>
          )}
        </header>

        <SettingsSection
          id="basics"
          title="Event basics"
          subtitle="Name, date, and where it happens"
          icon={<CalendarDays size={18} strokeWidth={1.8} />}
          open={open.basics}
          onToggle={toggle}
        >
          <div className="field-grid">
            <label>
              Event name
              <input
                value={name}
                maxLength={120}
                disabled={!editable || pending}
                onChange={(e) => onNameChange(e.target.value)}
              />
            </label>
            <label>
              Event date
              <input
                type="date"
                value={dateValue}
                disabled={!editable || pending}
                onChange={(e) => onProposeDate(e.target.value)}
              />
            </label>
            <label>
              Event location
              <input
                value={plan.location}
                maxLength={160}
                disabled={!editable || pending}
                placeholder="Location not set"
                onChange={(e) =>
                  onUpdate({ ...plan, location: e.target.value })
                }
              />
            </label>
          </div>
          {proposedDate !== null && (
            <div className="schedule-proposal">
              <h3>Review the date change</h3>
              <p>
                Fixed and completed task deadlines will stay as they are.
              </p>
              {deadlinePreview.map((change) => (
                <p key={change.id}>
                  {change.title}: {change.before || "Unscheduled"} to{" "}
                  {change.after || "Unscheduled"}
                </p>
              ))}
              <button type="button" className="secondary" onClick={onApplyDate}>
                Apply date & suggested deadlines
              </button>
              <button type="button" className="text-button" onClick={onApplyDateOnly}>
                Change event date only
              </button>
              <button type="button" className="text-button" onClick={onCancelDate}>
                Cancel
              </button>
            </div>
          )}
        </SettingsSection>

        <SettingsSection
          id="status"
          title="Status & money"
          subtitle="Planning status and currency"
          icon={<Coins size={18} strokeWidth={1.8} />}
          open={open.status}
          onToggle={toggle}
        >
          <div className="field-grid">
            <label>
              Event status
              <select
                value={plan.status}
                disabled={!editable || pending}
                onChange={(e) =>
                  onUpdate({
                    ...plan,
                    status: e.target.value as Plan["status"],
                  })
                }
              >
                <option value="DRAFT">Draft</option>
                <option value="PLANNING">Planning</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>
            <label>
              Currency
              <select
                value={plan.currency}
                disabled={!editable || pending}
                onChange={(e) =>
                  onCurrencyChange(e.target.value as Plan["currency"])
                }
              >
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <small>Changing currency does not convert amounts.</small>
            </label>
          </div>
        </SettingsSection>

        <SettingsSection
          id="notes"
          title="Description"
          subtitle="Share the story, add notes, or include special details"
          icon={<ClipboardList size={18} strokeWidth={1.8} />}
          open={open.notes}
          onToggle={toggle}
        >
          <label>
            Event description
            <textarea
              value={plan.notes}
              maxLength={2000}
              rows={5}
              disabled={!editable || pending}
              placeholder="Theme ideas, contacts, or reminders for your team."
              onChange={(e) => onUpdate({ ...plan, notes: e.target.value })}
            />
          </label>
        </SettingsSection>

        <SettingsSection
          id="theme"
          title="Theme & visuals"
          subtitle="Occasion look and the modules shown on this event"
          icon={<Sparkles size={18} strokeWidth={1.8} />}
          open={open.theme}
          onToggle={toggle}
        >
          <div className="settings-theme-preview">
            <span className={`settings-theme-swatch event-hero-${occasion?.color || "ivory"}`}>
              {occasion?.glyph || "✳"}
            </span>
            <div>
              <strong>{occasion?.name || "Celebration"}</strong>
              <p>
                Cards use this occasion cover by default. You can point to a
                hosted image URL; files are not uploaded into the event plan.
              </p>
            </div>
          </div>
          <label>
            Feature image URL
            <input
              value={plan.coverUrl ?? ""}
              maxLength={500}
              disabled={!editable || pending}
              placeholder="https://… or /covers/birthday.png"
              onChange={(e) =>
                onUpdate({ ...plan, coverUrl: e.target.value })
              }
            />
            <small>Leave blank to use the occasion cover.</small>
          </label>
          <p className="settings-acc-help">
            Turning a module off hides its tab and keeps its saved details.
          </p>
          {modules
            .filter((module) => module !== "seating")
            .map((module) => (
              <label className="check-label" key={module}>
                <input
                  type="checkbox"
                  checked={plan.modules.includes(module)}
                  disabled={!editable || pending}
                  onChange={(e) =>
                    onUpdate({
                      ...plan,
                      modules: e.target.checked
                        ? [...plan.modules, module]
                        : plan.modules.filter((item) => item !== module),
                    })
                  }
                />
                {MODULE_LABELS[module]}
              </label>
            ))}
        </SettingsSection>

        <SettingsSection
          id="privacy"
          title="Privacy & sharing"
          subtitle="Control who can view and respond"
          icon={<Users size={18} strokeWidth={1.8} />}
          open={open.privacy}
          onToggle={toggle}
        >
          <p>
            Access follows <strong>{spaceName}</strong> membership. This
            celebration does not have event-only privacy settings.
          </p>
          <p>
            Guests receive private RSVP links. Quote links are private to each
            provider. There is no public event page.
          </p>
          <button type="button" className="secondary" onClick={onOpenGuests}>
            Manage guest RSVP links
          </button>
        </SettingsSection>

        <SettingsSection
          id="advanced"
          title="Advanced settings"
          subtitle="Duplicate event, export data, or delete this celebration"
          icon={<Settings2 size={18} strokeWidth={1.8} />}
          open={open.advanced}
          onToggle={toggle}
        >
          <div className="settings-advanced-actions">
            {editable && (
              <button
                type="button"
                className="secondary"
                disabled={pending || dirty}
                onClick={onReuse}
              >
                Duplicate this event
              </button>
            )}
            <button
              type="button"
              className="secondary"
              disabled={dirty}
              onClick={onExport}
            >
              <Download size={14} /> Export event data
            </button>
            {canDelete && (
              <DeleteEventButton id={eventId} name={name} />
            )}
          </div>
          <small>
            Duplicate copies the plan structure and clears guests, payments, and
            vendor commitments. Exports include private planning details.
          </small>
        </SettingsSection>

        <p
          className={`settings-save-status${saveStatus === "error" ? " is-error" : ""}`}
          role="status"
        >
          {saveLabel}
        </p>
      </div>

      <aside className="settings-side">
        <section className="settings-side-card">
          <div className="settings-side-head">
            <Link2 size={18} strokeWidth={1.8} />
            <div>
              <h3>Event link</h3>
              <p>Share this event with guests</p>
            </div>
          </div>
          <p className="settings-link-copy">
            There is no public event page. Space members use this workspace
            link. Guests need a private RSVP link from the Guests tab.
          </p>
          <div className="settings-link-row">
            <code>{workspacePath}</code>
            <button
              type="button"
              className="settings-copy-btn"
              aria-label="Copy workspace link"
              onClick={copyWorkspaceLink}
            >
              <Copy size={15} />
            </button>
          </div>
          {copied && <p className="settings-copied">Copied workspace link</p>}
          <button type="button" className="secondary" onClick={onOpenGuests}>
            Manage guest RSVP links
          </button>
        </section>

        <section className="settings-side-card">
          <div className="settings-side-head">
            <Sparkles size={18} strokeWidth={1.8} />
            <div>
              <h3>Quick actions</h3>
              <p>Common actions for this celebration</p>
            </div>
          </div>
          <div className="settings-quick-list">
            {editable && (
              <button
                type="button"
                className="settings-quick-btn"
                disabled={pending || dirty}
                onClick={onReuse}
              >
                <ClipboardList size={16} />
                Duplicate this event
                <ArrowRight size={16} />
              </button>
            )}
            <button
              type="button"
              className="settings-quick-btn"
              disabled={dirty}
              onClick={onExport}
            >
              <Download size={16} />
              Export event data
              <ArrowRight size={16} />
            </button>
            {canDelete && (
              <DeleteEventButton id={eventId} name={name} variant="row" />
            )}
          </div>
        </section>

        <section className="settings-side-card settings-help-card">
          <div className="settings-side-head">
            <CircleHelp size={18} strokeWidth={1.8} />
            <div>
              <h3>Need help?</h3>
              <p>
                Check our help center or contact support if you need
                assistance.
              </p>
            </div>
          </div>
          <Link className="secondary" href="/help">
            Go to help center
            <ExternalLink size={14} />
          </Link>
        </section>
      </aside>
    </div>
  );
}
