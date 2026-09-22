"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Copy,
  Download,
  MapPin,
  MoreHorizontal,
  Pencil,
  Printer,
} from "@/components/icons";
import { Modal } from "@/components/modals";
import { DeleteEventButton } from "@/components/delete-event-button";
import {
  dateChanges,
  formatEventStatus,
  formatPlanDate,
  occasions,
  type Plan,
} from "@/lib/planning";
import { celebrationCover } from "@/lib/celebration-board";

export function EventDetailHeader({
  eventId,
  name,
  plan,
  spaceId,
  templateKey,
  editable,
  canDelete,
  saveStatus,
  onOpenDetails,
  onReuse,
  onExport,
  pending,
  dirty,
}: {
  eventId: string;
  name: string;
  plan: Plan;
  spaceId: string;
  templateKey: string;
  editable: boolean;
  canDelete: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onOpenDetails: () => void;
  onReuse: () => void;
  onExport: () => void;
  pending: boolean;
  dirty: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const occasion = occasions.find((o) => o.key === templateKey);
  const dateLabel = plan.date
    ? formatPlanDate(plan.date, "header")
    : "Date to be decided";
  const locationLabel = plan.location.trim()
    ? plan.location
    : "Location not set";

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <header className={`event-hero event-hero-${occasion?.color || "ivory"}`}>
      <div className="event-hero-copy">
        <nav className="event-breadcrumb" aria-label="Breadcrumb">
          <Link href={`/celebrations?space=${spaceId}`}>Celebrations</Link>
          <span aria-hidden="true">›</span>
          <span>{name || "Untitled celebration"}</span>
        </nav>
        <h1>{name || "Untitled celebration"}</h1>
        <div className="event-hero-meta">
          <span>
            <CalendarDays size={16} strokeWidth={1.7} />
            {dateLabel}
          </span>
          <span>
            <MapPin size={16} strokeWidth={1.7} />
            {locationLabel}
          </span>
          <span
            className={`event-status-pill event-status-pill-${plan.status.toLowerCase()}`}
          >
            {formatEventStatus(plan.status)}
          </span>
        </div>
        {plan.notes.trim() ? (
          <p className="event-hero-notes">{plan.notes}</p>
        ) : null}
      </div>
      <div className="event-hero-media" aria-hidden="true">
        <img
          className="event-hero-cover"
          src={celebrationCover(templateKey, plan.coverUrl)}
          alt=""
        />
      </div>
      <div className="event-hero-actions">
          {editable && (
            <button
              type="button"
              className="event-hero-edit"
              onClick={onOpenDetails}
            >
              <Pencil size={15} strokeWidth={1.8} />
              Edit details
            </button>
          )}
          <div className="event-more" ref={menuRef}>
            <button
              type="button"
              className="event-hero-more"
              aria-label="More event actions"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <div className="event-more-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  disabled={!editable || pending || dirty}
                  onClick={() => {
                    setMenuOpen(false);
                    onReuse();
                  }}
                >
                  <Copy size={14} />
                  Reuse this plan
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={dirty}
                  onClick={() => {
                    setMenuOpen(false);
                    onExport();
                  }}
                >
                  <Download size={14} />
                  Export plan
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    window.print();
                  }}
                >
                  <Printer size={14} />
                  Print
                </button>
                {canDelete && (
                  <DeleteEventButton
                    id={eventId}
                    name={name}
                    variant="menu"
                  />
                )}
              </div>
            )}
          </div>
      </div>
      {editable && (saveStatus !== "idle" || dirty) && (
        <div
          className={`event-autosave-fixed save-indicator${
            saveStatus === "saved"
              ? " is-saved"
              : saveStatus === "error"
                ? " is-error"
                : saveStatus === "saving"
                  ? " is-saving"
                  : dirty
                    ? " is-editing"
                    : ""
          }`}
          role="status"
        >
          {saveStatus === "saving" && "Saving..."}
          {saveStatus === "saved" && "Saved"}
          {saveStatus === "error" && "Couldn’t save"}
          {saveStatus === "idle" && dirty && "Editing..."}
        </div>
      )}
    </header>
  );
}

export function EventDetailsModal({
  open,
  name,
  plan,
  onClose,
  onSave,
}: {
  open: boolean;
  name: string;
  plan: Plan;
  onClose: () => void;
  onSave: (next: {
    name: string;
    date: string;
    location: string;
    status: Plan["status"];
    notes: string;
    applyDeadlines: boolean;
  }) => void;
}) {
  const [form, setForm] = useState({
    name,
    date: plan.date,
    location: plan.location,
    status: plan.status,
    notes: plan.notes,
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      name,
      date: plan.date,
      location: plan.location,
      status: plan.status,
      notes: plan.notes,
    });
  }, [open, name, plan.date, plan.location, plan.status, plan.notes]);

  const deadlineChanges =
    form.date !== plan.date ? dateChanges(plan, form.date) : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit event details"
      compact
      footer={
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="event-details-form" className="primary">
            Save details
          </button>
        </div>
      }
    >
      <form
        id="event-details-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim()) return;
          onSave({ ...form, applyDeadlines: deadlineChanges.length > 0 });
        }}
      >
        <label>
          Event name
          <input
            value={form.name}
            maxLength={120}
            required
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <div className="field-grid field-grid-modal">
          <label>
            Event date
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </label>
          <label>
            Location
            <input
              value={form.location}
              maxLength={160}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
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
        </div>
        <label>
          Notes
          <textarea
            rows={3}
            maxLength={2000}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>
        {deadlineChanges.length > 0 && (
          <div className="schedule-proposal">
            <h3>Relative deadlines will update</h3>
            {deadlineChanges.map((c) => (
              <p key={c.id}>
                {c.title}: {c.before || "Unscheduled"} to{" "}
                {c.after || "Unscheduled"}
              </p>
            ))}
            <small>
              Fixed and completed tasks keep their current due dates.
            </small>
          </div>
        )}
      </form>
    </Modal>
  );
}
