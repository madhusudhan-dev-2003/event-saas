"use client";
import { ActionForm } from "./forms";
import { checkout, portal } from "@/app/billing-actions";
export function Billing({
  spaceId,
  configured,
  hasCustomer,
  status,
  compact,
}: {
  spaceId: string;
  configured: boolean;
  hasCustomer: boolean;
  status: string;
  compact?: boolean;
}) {
  const label = status.toLowerCase().replaceAll("_", " ");
  return (
    <section className={`panel${compact ? " billing-panel" : ""}`}>
      {compact ? null : <p className="eyebrow">SPACE SUBSCRIPTION</p>}
      <h2>{compact ? "Billing" : "A plan for this part of your world."}</h2>
      {compact ? (
        <p className="settings-billing-status">
          <span
            className={
              status === "ACTIVE" || status === "active" || status === "trialing"
                ? "status-badge"
                : "role-badge"
            }
          >
            {label}
          </span>
          Software billing is separate from event and vendor payments.
        </p>
      ) : (
        <p>
          Status: <strong className="billing-status">{label}</strong>
        </p>
      )}
      {compact ? null : (
        <p>
          Your software subscription is separate from event fees and vendor
          payments. Cancellation retains your event data.
        </p>
      )}
      {!configured ? (
        <p className="notice">
          Plans are being configured. Pricing and paid entitlements will appear
          after they are approved.
        </p>
      ) : hasCustomer &&
        !["INACTIVE", "canceled", "incomplete_expired"].includes(status) ? (
        <ActionForm action={portal} label="Manage subscription">
          <input type="hidden" name="spaceId" value={spaceId} />
        </ActionForm>
      ) : (
        <ActionForm action={checkout} label="Review subscription in Stripe">
          <input type="hidden" name="spaceId" value={spaceId} />
        </ActionForm>
      )}
      {configured &&
        hasCustomer &&
        ["INACTIVE", "canceled", "incomplete_expired"].includes(status) && (
          <ActionForm action={portal} label="Open billing history">
            <input type="hidden" name="spaceId" value={spaceId} />
          </ActionForm>
        )}
      <small>
        Returning from checkout does not activate a plan. Verified Stripe
        confirmation updates the status.
      </small>
    </section>
  );
}
