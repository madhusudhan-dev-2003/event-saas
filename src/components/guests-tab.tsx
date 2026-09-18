"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { issueGuestRsvpLink, updateGuest } from "@/app/actions";
import { ConfirmDialog, Modal } from "@/components/modals";
import {
  CircleCheck,
  Clock,
  Copy,
  ExternalLink,
  Link2,
  Pencil,
  Plus,
  ScanLine,
  Search,
  UserRound,
  Users,
} from "@/components/icons";
import {
  filterAndSortGuests,
  guestCheckinLabel,
  guestResponseLabel,
  guestSummary,
  uniqueGuestGroups,
  type GuestFilters,
  type GuestRecord,
  type GuestSort,
} from "@/lib/guest-board";
import {
  HouseholdFormModal,
  type HouseholdFormValues,
} from "./household-form-modal";

function responseClass(guest: GuestRecord) {
  if (guest.revoked) return "guest-pill guest-pill-revoked";
  if (guest.response === "YES") return "guest-pill guest-pill-yes";
  if (guest.response === "NO") return "guest-pill guest-pill-no";
  if (guest.response === "MAYBE") return "guest-pill guest-pill-maybe";
  return "guest-pill guest-pill-pending";
}

function groupClass(side: string) {
  const key = side.trim().toLowerCase();
  if (key === "family") return "guest-group guest-group-family";
  if (key === "friends") return "guest-group guest-group-friends";
  if (key === "work") return "guest-group guest-group-work";
  if (key) return "guest-group guest-group-other";
  return "guest-muted";
}

function checkinClass(label: string) {
  if (label === "Checked in") return "guest-pill guest-pill-yes";
  if (label === "Not attending") return "guest-pill guest-pill-no";
  if (label === "Revoked") return "guest-pill guest-pill-revoked";
  return "guest-pill guest-pill-pending";
}

export function GuestsTab({
  eventId,
  guests,
  canManage,
  canCheckin,
}: {
  eventId: string;
  guests: GuestRecord[];
  canManage: boolean;
  canCheckin: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState<GuestFilters>({
    query: "",
    response: "all",
    group: "all",
    checkin: "all",
    sort: "name",
  });
  const [modal, setModal] = useState<{
    open: boolean;
    guestId: string | null;
  }>({ open: false, guestId: null });
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    action: () => void;
  } | null>(null);
  const [linkById, setLinkById] = useState<Record<string, string>>({});

  const summary = guestSummary(guests);
  const groups = uniqueGuestGroups(guests);
  const rows = filterAndSortGuests(guests, filters);
  const editing = guests.find((g) => g.id === modal.guestId) ?? null;
  const preview = guests.find((g) => g.id === previewId) ?? null;
  const filtersActive =
    filters.query.trim() !== "" ||
    filters.response !== "all" ||
    filters.group !== "all" ||
    filters.checkin !== "all";

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  function run(
    fn: () => Promise<{ error?: string; success?: string; path?: string }>,
  ) {
    setError("");
    startTransition(async () => {
      try {
        const result = await fn();
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.success) setMessage(result.success);
        if (!result.path) router.refresh();
      } catch {
        setError("We couldn't complete this action. Please try again.");
      }
    });
  }

  async function quickCheckin(guest: GuestRecord) {
    if (guest.revoked) {
      return { error: "This RSVP link has been revoked." };
    }
    if (guest.response === "NO") {
      return { error: "Declined households cannot be checked in." };
    }
    if (guest.checkedIn) {
      return updateGuest({ id: guest.id, action: "uncheckin" });
    }
    if (guest.response !== "YES") {
      if (!canManage) {
        return {
          error: "Mark this household as attending before check-in.",
        };
      }
      const updated = await updateGuest({
        id: guest.id,
        action: "update",
        response: "YES",
        attending: Math.max(1, guest.attending),
      });
      if (updated.error) return updated;
    }
    return updateGuest({ id: guest.id, action: "checkin" });
  }

  async function ensureLink(guest: GuestRecord) {
    if (guest.revoked) {
      setError("This RSVP link has been revoked.");
      return null;
    }
    if (linkById[guest.id]) return linkById[guest.id];
    const result = await issueGuestRsvpLink(guest.id);
    if (result.error) {
      setError(result.error);
      return null;
    }
    if (result.path) {
      setLinkById((current) => ({ ...current, [guest.id]: result.path! }));
      setMessage(result.success ?? "Private RSVP link ready.");
      return result.path;
    }
    return null;
  }

  const metrics = useMemo(
    () => [
      {
        label: "Households",
        value: summary.households,
        hint: "Invited to this event",
        icon: Users,
        tone: "rose",
      },
      {
        label: "Total invited",
        value: summary.invited,
        hint: "Across all households",
        icon: UserRound,
        tone: "slate",
      },
      {
        label: "Confirmed",
        value: summary.confirmed,
        hint: `${summary.responseRate}% response rate`,
        icon: CircleCheck,
        tone: "green",
      },
      {
        label: "Pending",
        value: summary.pending,
        hint: "Awaiting response",
        icon: Clock,
        tone: "amber",
      },
      {
        label: "Checked in",
        value: summary.checkedIn,
        hint: "Households at the event",
        icon: ScanLine,
        tone: "mint",
      },
    ],
    [summary],
  );

  return (
    <div className="guests-tab">
      <section className="guest-metrics" aria-label="Guest summary">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article
              key={metric.label}
              className={`guest-metric guest-metric-${metric.tone}`}
            >
              <span className="guest-metric-icon" aria-hidden="true">
                <Icon size={18} strokeWidth={1.8} />
              </span>
              <div>
                <strong>{metric.value}</strong>
                <h3>{metric.label}</h3>
                <p>{metric.hint}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="guest-list-card">
        <div className="plan-tasks-head">
          <div>
            <h2>Guest list</h2>
            <p>
              Manage households and their RSVP links. Guests can respond without
              creating an account.
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              className="btn-add"
              disabled={pending}
              onClick={() => setModal({ open: true, guestId: null })}
            >
              <Plus size={16} />
              Add household
            </button>
          )}
        </div>

        {guests.length > 0 && (
          <div className="plan-toolbar guest-toolbar">
            <div className="plan-toolbar-search">
              <Search size={15} />
              <input
                type="search"
                placeholder="Search households, contact, notes..."
                value={filters.query}
                onChange={(e) =>
                  setFilters({ ...filters, query: e.target.value })
                }
                aria-label="Search guests"
              />
            </div>
            <select
              value={filters.response}
              aria-label="All responses"
              onChange={(e) =>
                setFilters({
                  ...filters,
                  response: e.target.value as GuestFilters["response"],
                })
              }
            >
              <option value="all">All responses</option>
              <option value="yes">Attending</option>
              <option value="maybe">Maybe</option>
              <option value="no">Declined</option>
              <option value="pending">Pending</option>
              <option value="revoked">Revoked</option>
            </select>
            <select
              value={filters.group}
              aria-label="All groups"
              onChange={(e) =>
                setFilters({ ...filters, group: e.target.value })
              }
            >
              <option value="all">All groups</option>
              <option value="unset">Not set</option>
              {groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
            <select
              value={filters.checkin}
              aria-label="Check-in"
              onChange={(e) =>
                setFilters({
                  ...filters,
                  checkin: e.target.value as GuestFilters["checkin"],
                })
              }
            >
              <option value="all">All check-in</option>
              <option value="in">Checked in</option>
              <option value="out">Not checked in</option>
              <option value="not_attending">Not attending</option>
            </select>
            <div className="plan-sort">
              <span>Sort by</span>
              <select
                value={filters.sort}
                aria-label="Sort guests"
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    sort: e.target.value as GuestSort,
                  })
                }
              >
                <option value="name">Name</option>
                <option value="status">RSVP status</option>
                <option value="size">Most guests</option>
                <option value="recent">Recently added</option>
              </select>
            </div>
          </div>
        )}

        {!guests.length ? (
          <div className="plan-empty">
            <h3>No households added yet</h3>
            <p>Create a private RSVP link for your first household.</p>
            {canManage && (
              <div className="plan-empty-actions">
                <button
                  type="button"
                  className="btn-add"
                  onClick={() => setModal({ open: true, guestId: null })}
                >
                  <Plus size={16} />
                  Add household
                </button>
              </div>
            )}
          </div>
        ) : !rows.length ? (
          <div className="plan-empty">
            <h3>No households match these filters.</h3>
            {filtersActive && (
              <div className="plan-empty-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    setFilters({
                      query: "",
                      response: "all",
                      group: "all",
                      checkin: "all",
                      sort: filters.sort,
                    })
                  }
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="plan-table-wrap guest-table-wrap">
              <table className="plan-table guest-table">
                <thead>
                  <tr>
                    <th>Household</th>
                    <th>Group</th>
                    <th>Contact</th>
                    <th>Response</th>
                    <th>Attending</th>
                    <th>Dietary</th>
                    <th>Check-in</th>
                    <th className="plan-col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((guest) => (
                    <GuestRow
                      key={guest.id}
                      guest={guest}
                      pending={pending}
                      canManage={canManage}
                      canCheckin={canCheckin}
                      onOpen={() => setPreviewId(guest.id)}
                      onEdit={() =>
                        setModal({ open: true, guestId: guest.id })
                      }
                      onCopy={() =>
                        run(async () => {
                          const path = await ensureLink(guest);
                          if (!path) return {};
                          const href = `${window.location.origin}${path}`;
                          try {
                            await navigator.clipboard.writeText(href);
                            return { success: "RSVP link copied." };
                          } catch {
                            return { success: href };
                          }
                        })
                      }
                      onOpenLink={() =>
                        run(async () => {
                          const path = await ensureLink(guest);
                          if (!path) return {};
                          window.open(path, "_blank", "noopener,noreferrer");
                          return {};
                        })
                      }
                      onRevoke={() =>
                        setConfirm({
                          title: "Revoke RSVP link",
                          message:
                            "This household will no longer be able to respond with their private link.",
                          confirmLabel: "Revoke link",
                          danger: true,
                          action: () =>
                            run(() =>
                              updateGuest({
                                id: guest.id,
                                action: "revoke",
                              }),
                            ),
                        })
                      }
                      onCheckin={() => run(() => quickCheckin(guest))}
                      onUncheckin={() =>
                        run(() =>
                          updateGuest({
                            id: guest.id,
                            action: "uncheckin",
                          }),
                        )
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="plan-card-list">
              {rows.map((guest) => (
                <article
                  key={guest.id}
                  className="plan-task-card guest-card"
                  onClick={() => setPreviewId(guest.id)}
                >
                  <header>
                    <strong>{guest.household}</strong>
                    <span className={responseClass(guest)}>
                      {guest.revoked
                        ? "Revoked"
                        : guestResponseLabel(guest.response)}
                    </span>
                  </header>
                  <dl>
                    <div>
                      <dt>Group</dt>
                      <dd>{guest.side.trim() || "Not set"}</dd>
                    </div>
                    <div>
                      <dt>Contact</dt>
                      <dd>{guest.contact.trim() || "Not set"}</dd>
                    </div>
                    <div>
                      <dt>Attending</dt>
                      <dd>
                        {guest.attending} of {guest.maxGuests}
                      </dd>
                    </div>
                    <div>
                      <dt>Check-in</dt>
                      <dd onClick={(e) => e.stopPropagation()}>
                        <GuestCheckinControl
                          guest={guest}
                          pending={pending}
                          canCheckin={canCheckin}
                          canManage={canManage}
                          onCheckin={() => run(() => quickCheckin(guest))}
                          onUncheckin={() =>
                            run(() =>
                              updateGuest({
                                id: guest.id,
                                action: "uncheckin",
                              }),
                            )
                          }
                        />
                      </dd>
                    </div>
                  </dl>
                  {(canManage || canCheckin) && (
                    <div
                      className="plan-row-actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canManage && !guest.revoked && (
                        <>
                          <button
                            type="button"
                            className="plan-icon-btn"
                            title="Copy RSVP link"
                            aria-label={`Copy RSVP link for ${guest.household}`}
                            disabled={pending}
                            onClick={() =>
                              run(async () => {
                                const path = await ensureLink(guest);
                                if (!path) return {};
                                try {
                                  await navigator.clipboard.writeText(
                                    `${window.location.origin}${path}`,
                                  );
                                  return { success: "RSVP link copied." };
                                } catch {
                                  return {};
                                }
                              })
                            }
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            type="button"
                            className="plan-icon-btn"
                            title="Edit household"
                            aria-label={`Edit ${guest.household}`}
                            onClick={() =>
                              setModal({ open: true, guestId: guest.id })
                            }
                          >
                            <Pencil size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}

      <Modal
        open={!!preview}
        onClose={() => setPreviewId(null)}
        title="Household details"
        footer={
          <div className="modal-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => setPreviewId(null)}
            >
              Close
            </button>
            {canCheckin &&
              preview &&
              !preview.revoked &&
              preview.response !== "NO" && (
                <button
                  type="button"
                  className="secondary"
                  disabled={pending}
                  onClick={() => run(() => quickCheckin(preview))}
                >
                  <ScanLine size={15} />
                  {preview.checkedIn ? "Undo check-in" : "Check in"}
                </button>
              )}
            {canManage && preview && !preview.revoked && (
              <button
                type="button"
                className="primary"
                onClick={() => {
                  const id = preview.id;
                  setPreviewId(null);
                  setModal({ open: true, guestId: id });
                }}
              >
                <Pencil size={15} />
                Edit household
              </button>
            )}
          </div>
        }
      >
        {preview && (
          <div className="task-preview">
            <div className="task-preview-top">
              <h3>{preview.household}</h3>
              <div className="task-preview-pills">
                <span className={responseClass(preview)}>
                  {preview.revoked
                    ? "Revoked"
                    : guestResponseLabel(preview.response)}
                </span>
                <span className={checkinClass(guestCheckinLabel(preview))}>
                  {guestCheckinLabel(preview)}
                </span>
                {preview.side.trim() ? (
                  <span className={groupClass(preview.side)}>
                    {preview.side}
                  </span>
                ) : null}
              </div>
            </div>
            <dl className="task-preview-grid">
              <div>
                <dt>Contact</dt>
                <dd>{preview.contact.trim() || "Not set"}</dd>
              </div>
              <div>
                <dt>Group</dt>
                <dd>{preview.side.trim() || "Not set"}</dd>
              </div>
              <div>
                <dt>Attending</dt>
                <dd>
                  {preview.attending} of {preview.maxGuests}
                </dd>
              </div>
              <div>
                <dt>Dietary</dt>
                <dd>{preview.dietary.trim() || "—"}</dd>
              </div>
              <div>
                <dt>RSVP link</dt>
                <dd>{preview.revoked ? "Revoked" : "Active"}</dd>
              </div>
              <div>
                <dt>Check-in</dt>
                <dd>{guestCheckinLabel(preview)}</dd>
              </div>
            </dl>
            {preview.notes.trim() ? (
              <div className="task-preview-notes">
                <span>Notes</span>
                <p>{preview.notes}</p>
              </div>
            ) : null}
          </div>
        )}
      </Modal>

      <HouseholdFormModal
        open={modal.open}
        eventId={eventId}
        guest={editing}
        extraGroups={groups}
        onClose={() => setModal({ open: false, guestId: null })}
        onCreated={() => router.refresh()}
        onSave={(data: HouseholdFormValues) => {
          const guestId = modal.guestId;
          setModal({ open: false, guestId: null });
          if (!guestId) return;
          run(() =>
            updateGuest({
              id: guestId,
              action: "update",
              ...data,
            }),
          );
        }}
      />

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const action = confirm?.action;
          setConfirm(null);
          action?.();
        }}
      />
    </div>
  );
}

function GuestRow({
  guest,
  pending,
  canManage,
  canCheckin,
  onOpen,
  onEdit,
  onCopy,
  onOpenLink,
  onRevoke,
  onCheckin,
  onUncheckin,
}: {
  guest: GuestRecord;
  pending: boolean;
  canManage: boolean;
  canCheckin: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onOpenLink: () => void;
  onRevoke: () => void;
  onCheckin: () => void;
  onUncheckin: () => void;
}) {
  return (
    <tr
      className={`guest-row${guest.revoked ? " guest-row-revoked" : ""}`}
      onClick={onOpen}
    >
      <td>
        <button type="button" className="plan-task-open" onClick={onOpen}>
          <span className="plan-task-title">{guest.household}</span>
          {guest.notes.trim() ? (
            <small className="table-sub">{guest.notes}</small>
          ) : null}
        </button>
      </td>
      <td>
        {guest.side.trim() ? (
          <span className={groupClass(guest.side)}>{guest.side}</span>
        ) : (
          <span className="guest-muted">Not set</span>
        )}
      </td>
      <td>
        {guest.contact.trim() || <span className="guest-muted">Not set</span>}
      </td>
      <td>
        <span className={responseClass(guest)}>
          {guest.revoked ? "Revoked" : guestResponseLabel(guest.response)}
        </span>
      </td>
      <td>
        {guest.attending} of {guest.maxGuests}
      </td>
      <td>
        {guest.dietary.trim() ? (
          guest.dietary
        ) : (
          <span className="guest-muted">—</span>
        )}
      </td>
      <td
        onClick={(e) => e.stopPropagation()}
        className="guest-checkin-cell"
      >
        <GuestCheckinControl
          guest={guest}
          pending={pending}
          canCheckin={canCheckin}
          canManage={canManage}
          onCheckin={onCheckin}
          onUncheckin={onUncheckin}
        />
      </td>
      <td onClick={(e) => e.stopPropagation()}>
        <div className="plan-row-actions">
          {canManage && !guest.revoked && (
            <>
              <button
                type="button"
                className="plan-icon-btn"
                title="Copy RSVP link"
                aria-label={`Copy RSVP link for ${guest.household}`}
                disabled={pending}
                onClick={onCopy}
              >
                <Copy size={16} />
              </button>
              <button
                type="button"
                className="plan-icon-btn"
                title="Open RSVP link"
                aria-label={`Open RSVP link for ${guest.household}`}
                disabled={pending}
                onClick={onOpenLink}
              >
                <ExternalLink size={16} />
              </button>
              <button
                type="button"
                className="plan-icon-btn"
                title="Edit household"
                aria-label={`Edit ${guest.household}`}
                onClick={onEdit}
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                className="plan-icon-btn is-danger"
                title="Revoke RSVP link"
                aria-label={`Revoke RSVP link for ${guest.household}`}
                disabled={pending}
                onClick={onRevoke}
              >
                <Link2 size={16} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function GuestCheckinControl({
  guest,
  pending,
  canCheckin,
  canManage,
  onCheckin,
  onUncheckin,
}: {
  guest: GuestRecord;
  pending: boolean;
  canCheckin: boolean;
  canManage: boolean;
  onCheckin: () => void;
  onUncheckin: () => void;
}) {
  const label = guestCheckinLabel(guest);
  const canAct = canCheckin && !guest.revoked && guest.response !== "NO";
  const canMarkAttending = canManage || guest.response === "YES";

  if (canAct && guest.checkedIn) {
    return (
      <button
        type="button"
        className={`${checkinClass(label)} guest-pill-btn`}
        disabled={pending}
        title="Undo check-in"
        aria-label={`Undo check-in for ${guest.household}`}
        onClick={onUncheckin}
      >
        Checked in
      </button>
    );
  }

  if (canAct && canMarkAttending) {
    return (
      <button
        type="button"
        className="guest-checkin-action"
        disabled={pending}
        title={
          guest.response === "YES"
            ? "Check this household in"
            : "Mark as attending and check in"
        }
        aria-label={`Check in ${guest.household}`}
        onClick={onCheckin}
      >
        Check in
      </button>
    );
  }

  return <span className={checkinClass(label)}>{label}</span>;
}
