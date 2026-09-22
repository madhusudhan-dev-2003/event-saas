import { describe, expect, it } from "vitest";
import {
  filterAndSortGuests,
  guestCheckinLabel,
  guestSummary,
  type GuestRecord,
} from "./guest-board";

function guest(overrides: Partial<GuestRecord> = {}): GuestRecord {
  return {
    id: "a",
    household: "Sharma family",
    maxGuests: 4,
    attending: 4,
    response: "YES",
    dietary: "Vegetarian",
    contact: "Rohit",
    notes: "late",
    side: "Family",
    checkedIn: true,
    revoked: false,
    ...overrides,
  };
}

describe("guest summary", () => {
  it("ignores revoked households and uses household check-in", () => {
    const summary = guestSummary([
      guest(),
      guest({
        id: "b",
        household: "Mehta",
        maxGuests: 3,
        attending: 0,
        response: "PENDING",
        checkedIn: false,
        side: "Friends",
      }),
      guest({
        id: "c",
        household: "Old",
        revoked: true,
        maxGuests: 10,
        attending: 10,
        checkedIn: true,
      }),
    ]);
    expect(summary).toMatchObject({
      households: 2,
      invited: 7,
      confirmed: 4,
      pending: 1,
      checkedIn: 1,
    });
  });
});

describe("guest filters", () => {
  const guests = [
    guest(),
    guest({
      id: "b",
      household: "Mehta family",
      response: "MAYBE",
      attending: 2,
      maxGuests: 4,
      checkedIn: false,
      contact: "Priya",
      notes: "",
      side: "Friends",
      dietary: "",
    }),
    guest({
      id: "c",
      household: "Iyer family",
      response: "NO",
      attending: 0,
      maxGuests: 2,
      checkedIn: false,
      notes: "",
      side: "",
    }),
  ];

  it("searches household, contact, and notes", () => {
    expect(
      filterAndSortGuests(guests, {
        query: "late",
        response: "all",
        group: "all",
        checkin: "all",
        sort: "name",
      }).map((g) => g.id),
    ).toEqual(["a"]);
  });

  it("filters response and group", () => {
    expect(
      filterAndSortGuests(guests, {
        query: "",
        response: "maybe",
        group: "all",
        checkin: "all",
        sort: "name",
      }).map((g) => g.id),
    ).toEqual(["b"]);
    expect(
      filterAndSortGuests(guests, {
        query: "",
        response: "all",
        group: "unset",
        checkin: "all",
        sort: "name",
      }).map((g) => g.id),
    ).toEqual(["c"]);
  });

  it("sorts by name and party size", () => {
    expect(
      filterAndSortGuests(guests, {
        query: "",
        response: "all",
        group: "all",
        checkin: "all",
        sort: "name",
      }).map((g) => g.household),
    ).toEqual(["Iyer family", "Mehta family", "Sharma family"]);
    expect(
      filterAndSortGuests(guests, {
        query: "",
        response: "all",
        group: "all",
        checkin: "all",
        sort: "size",
      })[0].household,
    ).toBe("Sharma family");
  });

  it("filters household check-in status", () => {
    expect(
      filterAndSortGuests(guests, {
        query: "",
        response: "all",
        group: "all",
        checkin: "in",
        sort: "name",
      }).map((g) => g.id),
    ).toEqual(["a"]);
  });

  it("labels check-in from household state", () => {
    expect(guestCheckinLabel(guest())).toBe("Checked in");
    expect(guestCheckinLabel(guest({ checkedIn: false, response: "NO" }))).toBe(
      "Not attending",
    );
  });
});
