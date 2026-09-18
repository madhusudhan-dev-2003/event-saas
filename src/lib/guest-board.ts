export type GuestRecord = {
  id: string;
  household: string;
  maxGuests: number;
  attending: number;
  response: string;
  dietary: string;
  contact: string;
  notes: string;
  side: string;
  checkedIn: boolean;
  revoked: boolean;
};

export type GuestSort = "name" | "status" | "size" | "recent";

export type GuestFilters = {
  query: string;
  response: "all" | "yes" | "no" | "maybe" | "pending" | "revoked";
  group: "all" | "unset" | string;
  checkin: "all" | "in" | "out" | "not_attending";
  sort: GuestSort;
};

export function guestResponseLabel(response: string) {
  if (response === "YES") return "Attending";
  if (response === "NO") return "Declined";
  if (response === "MAYBE") return "Maybe";
  if (response === "PENDING") return "Pending";
  return response;
}

export function guestCheckinLabel(guest: GuestRecord) {
  if (guest.revoked) return "Revoked";
  if (guest.response === "NO") return "Not attending";
  if (guest.checkedIn) return "Checked in";
  return "Not checked in";
}

export function guestSummary(guests: GuestRecord[]) {
  const active = guests.filter((g) => !g.revoked);
  const confirmed = active
    .filter((g) => g.response === "YES")
    .reduce((n, g) => n + g.attending, 0);
  const responded = active.filter((g) => g.response !== "PENDING").length;
  return {
    households: active.length,
    invited: active.reduce((n, g) => n + g.maxGuests, 0),
    confirmed,
    pending: active.filter((g) => g.response === "PENDING").length,
    checkedIn: active.filter((g) => g.checkedIn).length,
    responseRate:
      active.length === 0 ? 0 : Math.round((responded / active.length) * 100),
  };
}

export function uniqueGuestGroups(guests: GuestRecord[]) {
  return [
    ...new Set(
      guests.map((g) => g.side.trim()).filter((value) => value.length > 0),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

const STATUS_RANK: Record<string, number> = {
  YES: 0,
  MAYBE: 1,
  PENDING: 2,
  NO: 3,
};

export function filterAndSortGuests(
  guests: GuestRecord[],
  filters: GuestFilters,
) {
  const q = filters.query.trim().toLowerCase();
  const filtered = guests.filter((guest) => {
    const matchesQuery =
      !q ||
      guest.household.toLowerCase().includes(q) ||
      guest.contact.toLowerCase().includes(q) ||
      guest.notes.toLowerCase().includes(q);
    const status = guest.revoked ? "revoked" : guest.response.toLowerCase();
    const matchesResponse =
      filters.response === "all" || status === filters.response;
    const group = guest.side.trim();
    const matchesGroup =
      filters.group === "all" ||
      (filters.group === "unset" && !group) ||
      group === filters.group;
    const checkinLabel = guestCheckinLabel(guest);
    const matchesCheckin =
      filters.checkin === "all" ||
      (filters.checkin === "in" && checkinLabel === "Checked in") ||
      (filters.checkin === "out" && checkinLabel === "Not checked in") ||
      (filters.checkin === "not_attending" &&
        checkinLabel === "Not attending");
    return matchesQuery && matchesResponse && matchesGroup && matchesCheckin;
  });

  return filtered.sort((a, b) => {
    if (filters.sort === "size") return b.maxGuests - a.maxGuests;
    if (filters.sort === "recent") return b.id.localeCompare(a.id);
    if (filters.sort === "status") {
      const aRank = a.revoked ? 4 : (STATUS_RANK[a.response] ?? 5);
      const bRank = b.revoked ? 4 : (STATUS_RANK[b.response] ?? 5);
      if (aRank !== bRank) return aRank - bRank;
    }
    return a.household.localeCompare(b.household);
  });
}
