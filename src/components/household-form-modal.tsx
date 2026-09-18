"use client";

import { useEffect, useState } from "react";
import { GuestForm } from "@/components/forms";
import { Modal } from "@/components/modals";
import type { GuestRecord } from "@/lib/guest-board";

export type HouseholdFormValues = {
  household: string;
  maxGuests: number;
  response: "PENDING" | "YES" | "NO" | "MAYBE";
  attending: number;
  dietary: string;
  contact: string;
  notes: string;
  side: string;
};

const GROUPS = ["Family", "Friends", "Work", "Other"];

export function HouseholdFormModal({
  open,
  eventId,
  guest,
  extraGroups = [],
  onClose,
  onCreated,
  onSave,
}: {
  open: boolean;
  eventId: string;
  guest: GuestRecord | null;
  extraGroups?: string[];
  onClose: () => void;
  onCreated: () => void;
  onSave: (data: HouseholdFormValues) => void;
}) {
  const [formData, setFormData] = useState<HouseholdFormValues>({
    household: "",
    maxGuests: 1,
    response: "PENDING",
    attending: 0,
    dietary: "",
    contact: "",
    notes: "",
    side: "",
  });
  const [formError, setFormError] = useState("");
  const groups = [
    ...GROUPS,
    ...extraGroups.filter((g) => !GROUPS.includes(g)),
  ];

  useEffect(() => {
    if (!open) return;
    setFormError("");
    if (guest) {
      setFormData({
        household: guest.household,
        maxGuests: guest.maxGuests,
        response: (["PENDING", "YES", "NO", "MAYBE"].includes(guest.response)
          ? guest.response
          : "PENDING") as HouseholdFormValues["response"],
        attending: guest.attending,
        dietary: guest.dietary,
        contact: guest.contact ?? "",
        notes: guest.notes ?? "",
        side: guest.side ?? "",
      });
    }
  }, [guest, open]);

  if (guest) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        wide
        title="Edit household"
        footer={
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" form="household-edit-form" className="primary">
              Save household
            </button>
          </div>
        }
      >
        <form
          id="household-edit-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!formData.household.trim()) {
              setFormError("Enter a household name.");
              return;
            }
            if (formData.maxGuests < 1 || formData.maxGuests > 100) {
              setFormError("Maximum people must be between 1 and 100.");
              return;
            }
            if (
              formData.response === "YES" &&
              (formData.attending < 1 ||
                formData.attending > formData.maxGuests)
            ) {
              setFormError("Attending count must fit the invitation limit.");
              return;
            }
            onSave({
              ...formData,
              household: formData.household.trim(),
              attending: formData.response === "YES" ? formData.attending : 0,
            });
          }}
        >
          <HouseholdFields
            formData={formData}
            setFormData={setFormData}
            groups={groups}
            includeRsvp
          />
          {formError && (
            <p role="alert" className="error">
              {formError}
            </p>
          )}
        </form>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} wide title="Add household">
      <GuestForm eventId={eventId} onSuccess={onCreated} />
    </Modal>
  );
}

function HouseholdFields({
  formData,
  setFormData,
  groups,
  includeRsvp,
}: {
  formData: HouseholdFormValues;
  setFormData: (next: HouseholdFormValues) => void;
  groups: string[];
  includeRsvp: boolean;
}) {
  return (
    <>
      <div className="field-grid field-grid-modal">
        <label>
          Household name
          <input
            value={formData.household}
            maxLength={120}
            required
            onChange={(e) =>
              setFormData({ ...formData, household: e.target.value })
            }
          />
        </label>
        <label>
          Maximum guests
          <input
            type="number"
            min={1}
            max={100}
            value={formData.maxGuests}
            onChange={(e) =>
              setFormData({
                ...formData,
                maxGuests: Number(e.target.value),
              })
            }
          />
        </label>
        <label>
          Contact
          <input
            value={formData.contact}
            maxLength={160}
            placeholder="Phone or email"
            onChange={(e) =>
              setFormData({ ...formData, contact: e.target.value })
            }
          />
        </label>
        <label>
          Group / side
          <select
            value={formData.side}
            onChange={(e) =>
              setFormData({ ...formData, side: e.target.value })
            }
          >
            <option value="">Not set</option>
            {groups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </label>
        {includeRsvp && (
          <>
            <label>
              Response status
              <select
                value={formData.response}
                onChange={(e) => {
                  const response = e.target
                    .value as HouseholdFormValues["response"];
                  setFormData({
                    ...formData,
                    response,
                    attending:
                      response === "YES" ? Math.max(1, formData.attending) : 0,
                  });
                }}
              >
                <option value="PENDING">Pending</option>
                <option value="YES">Attending</option>
                <option value="NO">Declined</option>
                <option value="MAYBE">Maybe</option>
              </select>
            </label>
            {formData.response === "YES" && (
              <label>
                Attending count
                <input
                  type="number"
                  min={1}
                  max={formData.maxGuests}
                  value={formData.attending}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      attending: Number(e.target.value),
                    })
                  }
                />
              </label>
            )}
          </>
        )}
      </div>
      <label>
        Dietary needs
        <input
          value={formData.dietary}
          maxLength={500}
          placeholder="Optional"
          onChange={(e) =>
            setFormData({ ...formData, dietary: e.target.value })
          }
        />
      </label>
      <label>
        Notes
        <textarea
          value={formData.notes}
          maxLength={500}
          rows={2}
          placeholder="Seating, arrival, or other notes"
          onChange={(e) =>
            setFormData({ ...formData, notes: e.target.value })
          }
        />
      </label>
    </>
  );
}
