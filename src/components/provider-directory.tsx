"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addDirectoryVendor } from "@/app/provider-actions";
import { ProviderForm } from "@/components/provider-forms";
import { Modal } from "@/components/modals";
import {
  CircleCheck,
  CircleDashed,
  Copy,
  MapPin,
  Pencil,
  Plus,
  Search,
  Store,
  Tag,
} from "@/components/icons";

export type DirectoryProvider = {
  id: string;
  name: string;
  category: string;
  location: string;
  description: string;
  contact: string;
};

export type DirectoryEvent = {
  id: string;
  name: string;
  services: { id: string; category: string }[];
};

export type OwnProvider = {
  name: string;
  category: string;
  location: string;
  description: string;
  contact: string;
  published: boolean;
} | null;

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function AddToCelebrationForm({
  providerId,
  events,
}: {
  providerId: string;
  events: DirectoryEvent[];
}) {
  const [state, action, pending] = useActionState(addDirectoryVendor, {});
  const [eventId, setEventId] = useState(events[0]?.id || "");
  const services =
    events.find((event) => event.id === eventId)?.services || [];

  if (!events.length) {
    return (
      <p className="modal-lead">
        Create a celebration in this space before adding a provider to a
        service shortlist.
      </p>
    );
  }

  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="providerId" value={providerId} />
      <label>
        Celebration
        <select
          name="eventId"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          required
        >
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Service
        <select name="serviceId" required disabled={!services.length}>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.category}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="primary"
        disabled={pending || !services.length}
      >
        {pending ? "Adding..." : "Add to shortlist"}
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

export function ProviderDirectory({
  providers,
  own,
  emailVerified,
  signedIn,
  loginHref,
  canAddVendors,
  events,
  openManage = false,
  initialQuery = "",
}: {
  providers: DirectoryProvider[];
  own: OwnProvider;
  emailVerified: boolean;
  signedIn: boolean;
  loginHref: string;
  canAddVendors: boolean;
  events: DirectoryEvent[];
  openManage?: boolean;
  initialQuery?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("all");
  const [profileOpen, setProfileOpen] = useState(openManage);
  const [selected, setSelected] = useState<DirectoryProvider | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!openManage) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("manage")) return;
    url.searchParams.delete("manage");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [openManage]);

  const categories = useMemo(() => {
    return [...new Set(providers.map((item) => item.category).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b),
    );
  }, [providers]);

  const locations = useMemo(() => {
    return [
      ...new Set(providers.map((item) => item.location).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b));
  }, [providers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return providers.filter((item) => {
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.contact.toLowerCase().includes(q);
      const matchesCategory = category === "all" || item.category === category;
      const matchesLocation = location === "all" || item.location === location;
      return matchesQuery && matchesCategory && matchesLocation;
    });
  }, [providers, query, category, location]);

  function closeProfile() {
    setProfileOpen(false);
    router.refresh();
  }

  async function copyContact(value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="provider-hub">
      <header className="page-header-bar">
        <div>
          <h1>Provider directory</h1>
          <p>
            Published business profiles from people on Utsava. Add one to a
            celebration shortlist, or publish your own listing.
          </p>
        </div>
        {signedIn ? (
          <button
            type="button"
            className="btn-add"
            onClick={() => setProfileOpen(true)}
          >
            <Pencil size={16} />
            {own ? "Manage my provider profile" : "Create provider profile"}
          </button>
        ) : (
          <Link className="btn-add" href={loginHref}>
            Sign in to list your business
          </Link>
        )}
      </header>

      <div className="celeb-kpi-grid users-kpi-grid">
        <div className="celeb-kpi">
          <span className="celeb-kpi-icon is-rose">
            <Store size={18} />
          </span>
          <b>Published listings</b>
          <strong>{providers.length}</strong>
        </div>
        <div className="celeb-kpi">
          <span className="celeb-kpi-icon is-sage">
            <Tag size={18} />
          </span>
          <b>Service types</b>
          <strong>{categories.length}</strong>
        </div>
        <div className="celeb-kpi">
          <span className="celeb-kpi-icon is-sky">
            <MapPin size={18} />
          </span>
          <b>Service areas</b>
          <strong>{locations.length}</strong>
        </div>
        <div className="celeb-kpi">
          <span className="celeb-kpi-icon is-peach">
            {own?.published ? (
              <CircleCheck size={18} />
            ) : (
              <CircleDashed size={18} />
            )}
          </span>
          <b>Your listing</b>
          <strong>{own ? 1 : 0}</strong>
        </div>
      </div>

      {own && !own.published ? (
        <div className="provider-own-note">
          <div>
            <strong>{own.name}</strong>
            <p>
              Saved privately as {own.category || "your service"}. Publish it
              from your profile if you want it in this directory.
            </p>
          </div>
          <button
            type="button"
            className="secondary"
            onClick={() => setProfileOpen(true)}
          >
            Edit listing
          </button>
        </div>
      ) : null}

      <div className="users-toolbar provider-toolbar">
        <label className="celeb-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, service, area or contact"
            aria-label="Search providers"
          />
        </label>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          aria-label="Filter by service area"
        >
          <option value="all">All areas</option>
          {locations.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {categories.length ? (
        <div className="role-tabs">
          <button
            type="button"
            className={category === "all" ? "role-tab active" : "role-tab"}
            onClick={() => setCategory("all")}
          >
            All
          </button>
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={category === item ? "role-tab active" : "role-tab"}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length ? (
        <div className="provider-grid">
          {filtered.map((item) => (
            <button
              type="button"
              className="provider-card"
              key={item.id}
              onClick={() => setSelected(item)}
            >
              <div className="provider-card-top">
                <span className="provider-avatar">{initials(item.name)}</span>
                <div>
                  <span className="pill">{item.category}</span>
                  <h2>{item.name}</h2>
                </div>
              </div>
              {item.location ? (
                <p className="provider-meta">
                  <MapPin size={14} /> {item.location}
                </p>
              ) : (
                <p className="provider-meta">Service area not listed</p>
              )}
              <p className="provider-excerpt">
                {item.description || "No description published yet."}
              </p>
              <span className="provider-contact">
                {item.contact || "Contact shared after they publish it"}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>
            {providers.length
              ? "No listings match this search."
              : "No published providers yet."}
          </h2>
          <p>
            {providers.length
              ? "Clear the search or choose another service to see more listings."
              : "We only show businesses people publish themselves. Create your profile if you offer a service."}
          </p>
          {!own && signedIn ? (
            <button
              type="button"
              className="btn-add"
              onClick={() => setProfileOpen(true)}
            >
              <Plus size={16} /> Create provider profile
            </button>
          ) : null}
        </div>
      )}

      <Modal
        open={profileOpen}
        onClose={closeProfile}
        title={own ? "Manage provider profile" : "Create provider profile"}
        compact
      >
        {profileOpen ? (
          <ProviderForm
            profile={own}
            emailVerified={emailVerified}
            onDone={closeProfile}
          />
        ) : null}
      </Modal>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name || "Provider"}
        compact
      >
        {selected ? (
          <div className="provider-detail">
            <span className="pill">{selected.category}</span>
            {selected.location ? (
              <p className="provider-meta">
                <MapPin size={14} /> {selected.location}
              </p>
            ) : null}
            <p>{selected.description || "No description published yet."}</p>
            <div className="provider-contact-row">
              <div>
                <small>Business contact</small>
                <strong>{selected.contact || "Not published"}</strong>
              </div>
              {selected.contact ? (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => copyContact(selected.contact)}
                >
                  <Copy size={16} /> {copied ? "Copied" : "Copy"}
                </button>
              ) : null}
            </div>
            {canAddVendors ? (
              <>
                <h3>Add to a celebration</h3>
                <AddToCelebrationForm
                  providerId={selected.id}
                  events={events}
                />
              </>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
