"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Building2,
  ChevronDown,
  Eye,
  Flower2,
  Music,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Store,
  Trash2,
  Users,
  Utensils,
} from "@/components/icons";
import { formatMoney, type Plan } from "@/lib/planning";
import {
  SERVICE_STATUS_FILTERS,
  chosenVendor,
  filterServices,
  nextStatusAfterChoose,
  serviceCategoryIcon,
  serviceStatusCounts,
  serviceStatusLabel,
  vendorAvailabilityLabel,
  vendorTotals,
  type ServiceItem,
  type VendorStatusFilter,
} from "@/lib/vendor-board";

function ServiceIcon({ category }: { category: string }) {
  const kind = serviceCategoryIcon(category);
  const props = { size: 16, strokeWidth: 1.8 };
  if (kind === "cake") return <Flower2 {...props} />;
  if (kind === "catering") return <Utensils {...props} />;
  if (kind === "photo") return <Eye {...props} />;
  if (kind === "music") return <Music {...props} />;
  if (kind === "decor") return <Sparkles {...props} />;
  if (kind === "venue") return <Building2 {...props} />;
  return <Store {...props} />;
}

const BOOKING_STATUSES = SERVICE_STATUS_FILTERS.filter(
  (filter) => filter.id !== "all",
);

function BookingStatusSelect({
  value,
  canManage,
  disabled,
  hasChosen,
  onChange,
}: {
  value: ServiceItem["status"];
  canManage: boolean;
  disabled: boolean;
  hasChosen: boolean;
  onChange: (status: ServiceItem["status"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return canManage ? (
    <div className="vendor-status-select" ref={wrapRef}>
      <button
        type="button"
        className={`vendor-status-trigger${open ? " is-open" : ""}`}
        aria-label="Booking status"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={`vendor-status vendor-status-${value.toLowerCase()}`}>
          {serviceStatusLabel(value)}
        </span>
        <ChevronDown size={14} className={open ? "is-rotated" : undefined} />
      </button>
      {open && (
        <ul
          className="vendor-status-menu"
          role="listbox"
          aria-label="Booking status"
        >
          {BOOKING_STATUSES.map((option) => {
            const locked = option.id !== "SHORTLISTED" && !hasChosen;
            return (
              <li key={option.id} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={option.id === value}
                  aria-disabled={locked}
                  disabled={locked}
                  className={option.id === value ? "is-selected" : undefined}
                  onClick={() => {
                    if (locked) return;
                    onChange(option.id as ServiceItem["status"]);
                    setOpen(false);
                  }}
                >
                  <span
                    className={`vendor-status vendor-status-${option.id.toLowerCase()}`}
                  >
                    {option.label}
                  </span>
                  {locked && <small>Choose a provider first</small>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  ) : (
    <span className={`vendor-status vendor-status-${value.toLowerCase()}`}>
      {serviceStatusLabel(value)}
    </span>
  );
}

export function VendorsTab({
  eventId,
  plan,
  pending,
  canManage,
  canQuotes,
  canBrowseProviders,
  onAddService,
  onEditService,
  onDeleteService,
  onAddProvider,
  onEditProvider,
  onDeleteProvider,
  onPatchService,
}: {
  eventId: string;
  plan: Plan;
  pending: boolean;
  canManage: boolean;
  canQuotes: boolean;
  canBrowseProviders: boolean;
  onAddService: () => void;
  onEditService: (index: number) => void;
  onDeleteService: (index: number) => void;
  onAddProvider: (serviceIndex: number) => void;
  onEditProvider: (serviceIndex: number, vendorIndex: number) => void;
  onDeleteProvider: (serviceIndex: number, vendorIndex: number) => void;
  onPatchService: (index: number, patch: Partial<ServiceItem>) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<VendorStatusFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const totals = vendorTotals(plan.services);
  const counts = serviceStatusCounts(plan.services);
  const rows = filterServices(plan.services, query, status);
  const filtersActive = query.trim() !== "" || status !== "all";

  return (
    <div className="vendors-tab">
      <section className="vendors-card">
        <div className="plan-tasks-head">
          <div>
            <h2>Vendors & Services</h2>
            <p>
              One card per service. Compare providers inside, choose one, then
              move booking status from shortlist to paid.
            </p>
          </div>
          <div className="vendors-head-actions">
            {canBrowseProviders && (
              <Link className="secondary btn-compact" href="/providers">
                Provider directory
              </Link>
            )}
            {canQuotes && (
              <Link className="btn-add" href={`/events/${eventId}/quotes`}>
                Private quotes
              </Link>
            )}
            {canManage && (
              <button
                type="button"
                className="btn-add"
                disabled={pending}
                onClick={onAddService}
              >
                <Plus size={16} />
                Add service
              </button>
            )}
          </div>
        </div>

        <div className="vendor-kpis">
          <article>
            <strong>{totals.services}</strong>
            <span>Services</span>
          </article>
          <article>
            <strong>{totals.providers}</strong>
            <span>Providers</span>
          </article>
          <article>
            <strong>{totals.chosen}</strong>
            <span>Chosen</span>
          </article>
          <article>
            <strong>{totals.confirmed}</strong>
            <span>Confirmed</span>
          </article>
          <article>
            <strong>{formatMoney(totals.quotesTotal, plan.currency)}</strong>
            <span>Total chosen quotes ({plan.currency})</span>
          </article>
        </div>

        {plan.services.length > 0 && (
          <div className="vendor-toolbar">
            <div className="vendor-chips" role="tablist" aria-label="Booking status">
              {SERVICE_STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  role="tab"
                  aria-selected={status === filter.id}
                  className={
                    status === filter.id
                      ? "vendor-chip is-active"
                      : "vendor-chip"
                  }
                  onClick={() => setStatus(filter.id)}
                >
                  {filter.label}
                  {filter.id !== "all" && (
                    <em>{counts[filter.id]}</em>
                  )}
                </button>
              ))}
            </div>
            <div className="plan-toolbar-search vendor-search">
              <Search size={15} />
              <input
                type="search"
                placeholder="Search services or providers..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search services or providers"
              />
            </div>
          </div>
        )}

        {!plan.services.length ? (
          <div className="plan-empty">
            <h3>No services added yet</h3>
            <p>
              Start by adding a service category such as cake, catering, venue,
              or photography.
            </p>
            <div className="plan-empty-actions">
              {canManage && (
                <button type="button" className="btn-add" onClick={onAddService}>
                  <Plus size={16} />
                  Add service
                </button>
              )}
              {canBrowseProviders && (
                <Link className="secondary" href="/providers">
                  Open provider directory
                </Link>
              )}
            </div>
          </div>
        ) : !rows.length ? (
          <div className="plan-empty">
            <h3>No services match these filters.</h3>
            {filtersActive && (
              <div className="plan-empty-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setQuery("");
                    setStatus("all");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <ul className="vendor-service-list">
            {rows.map((service) => {
              const index = plan.services.findIndex((item) => item.id === service.id);
              const selected = chosenVendor(service);
              const expanded = openId === service.id;
              return (
                <li
                  key={service.id}
                  className={`vendor-service${expanded ? " is-open" : ""}`}
                >
                  <div className="vendor-service-row">
                    <span
                      className={`vendor-service-icon vendor-icon-${serviceCategoryIcon(service.category)}`}
                    >
                      <ServiceIcon category={service.category} />
                    </span>
                    <div className="vendor-service-copy">
                      <div className="vendor-service-title">
                        <strong>{service.category}</strong>
                        <span
                          className={`vendor-status vendor-status-${service.status.toLowerCase()}`}
                        >
                          {serviceStatusLabel(service.status)}
                        </span>
                      </div>
                      <p>
                        {service.requirements.trim() ||
                          "No requirements yet"}
                      </p>
                    </div>
                    <span className="vendor-service-count">
                      <Users size={14} strokeWidth={1.8} />
                      {service.vendors.length}{" "}
                      {service.vendors.length === 1 ? "provider" : "providers"}
                    </span>
                    <span className="vendor-service-quote">
                      <strong>
                        {selected
                          ? formatMoney(selected.quote, plan.currency)
                          : formatMoney(0, plan.currency)}
                      </strong>
                      <small>
                        {selected ? selected.name : "No quote chosen"}
                      </small>
                    </span>
                    <div className="plan-row-actions">
                      <button
                        type="button"
                        className="plan-icon-btn"
                        title={expanded ? "Collapse service" : "Expand service"}
                        aria-expanded={expanded}
                        aria-label={`${expanded ? "Collapse" : "Expand"} ${service.category}`}
                        onClick={() =>
                          setOpenId(expanded ? null : service.id)
                        }
                      >
                        <ChevronDown
                          size={16}
                          className={expanded ? "is-rotated" : undefined}
                        />
                      </button>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            className="plan-icon-btn"
                            title="Edit service"
                            aria-label={`Edit ${service.category}`}
                            disabled={pending}
                            onClick={() => onEditService(index)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="plan-icon-btn is-danger"
                            title="Delete service"
                            aria-label={`Delete ${service.category}`}
                            disabled={pending}
                            onClick={() => onDeleteService(index)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {expanded && (
                    <div className="vendor-service-body">
                      {!service.vendors.length ? (
                        <div className="plan-empty vendor-provider-empty">
                          <h3>No providers added yet</h3>
                          <p>
                            Add providers manually or import from private
                            quotes.
                          </p>
                        </div>
                      ) : (
                        <div className="plan-table-wrap vendor-compare-wrap">
                          <table className="plan-table vendor-compare-table">
                            <thead>
                              <tr>
                                <th className="vendor-col-provider">Provider</th>
                                <th className="vendor-col-avail">Availability</th>
                                <th className="vendor-col-quote">Quote</th>
                                <th className="vendor-col-notes">Notes</th>
                                <th className="vendor-col-actions">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {service.vendors.map((vendor, vendorIndex) => {
                                const chosen = service.selectedId === vendor.id;
                                return (
                                  <tr
                                    key={vendor.id}
                                    className={chosen ? "is-chosen" : undefined}
                                  >
                                    <td className="vendor-col-provider">
                                      <strong>{vendor.name}</strong>
                                      {vendor.contact.trim() && (
                                        <small className="vendor-muted">
                                          {vendor.contact}
                                        </small>
                                      )}
                                    </td>
                                    <td className="vendor-col-avail">
                                      {vendorAvailabilityLabel(
                                        vendor.availability,
                                      )}
                                    </td>
                                    <td className="vendor-col-quote">
                                      {formatMoney(vendor.quote, plan.currency)}
                                    </td>
                                    <td className="vendor-col-notes">
                                      <p
                                        className="vendor-notes"
                                        title={vendor.notes.trim() || undefined}
                                      >
                                        {vendor.notes.trim() || "—"}
                                      </p>
                                    </td>
                                    <td className="vendor-col-actions">
                                      <div className="plan-row-actions">
                                        {canManage && (
                                          <button
                                            type="button"
                                            className={
                                              chosen
                                                ? "btn-compact btn-compact-active"
                                                : "btn-compact"
                                            }
                                            disabled={pending}
                                            onClick={() =>
                                              onPatchService(
                                                index,
                                                nextStatusAfterChoose(
                                                  service,
                                                  vendor.id,
                                                ),
                                              )
                                            }
                                          >
                                            {chosen ? "Selected" : "Choose"}
                                          </button>
                                        )}
                                        {canManage && (
                                          <>
                                            <button
                                              type="button"
                                              className="plan-icon-btn"
                                              title="Edit provider"
                                              aria-label={`Edit ${vendor.name}`}
                                              disabled={pending}
                                              onClick={() =>
                                                onEditProvider(index, vendorIndex)
                                              }
                                            >
                                              <Pencil size={16} />
                                            </button>
                                            <button
                                              type="button"
                                              className="plan-icon-btn is-danger"
                                              title="Delete provider"
                                              aria-label={`Delete ${vendor.name}`}
                                              disabled={pending}
                                              onClick={() =>
                                                onDeleteProvider(
                                                  index,
                                                  vendorIndex,
                                                )
                                              }
                                            >
                                              <Trash2 size={16} />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <div className="vendor-compare-foot">
                        {canManage && (
                          <button
                            type="button"
                            className="vendor-add-provider"
                            disabled={pending}
                            onClick={() => onAddProvider(index)}
                          >
                            <Plus size={14} />
                            Add another provider
                          </button>
                        )}
                        <BookingStatusSelect
                          value={service.status}
                          canManage={canManage}
                          disabled={pending}
                          hasChosen={Boolean(service.selectedId)}
                          onChange={(nextStatus) =>
                            onPatchService(index, { status: nextStatus })
                          }
                        />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
