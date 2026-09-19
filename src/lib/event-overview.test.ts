import { describe, expect, it } from "vitest";
import { eventOverview, rsvpSlices } from "./event-overview";
import { newPlan } from "./planning";

describe("event overview", () => {
  it("counts days until a dated celebration", () => {
    const plan = { ...newPlan("birthday"), date: "2026-09-30" };
    const view = eventOverview(plan, [], "2026-09-19");
    expect(view.days).toBe(11);
    expect(view.clockValue).toBe("11");
    expect(view.statusLabel).toBe("Draft");
  });

  it("splits guest replies without inventing households", () => {
    const slices = rsvpSlices([
      {
        id: "1",
        household: "A",
        maxGuests: 2,
        attending: 2,
        response: "YES",
        dietary: "",
        contact: "",
        notes: "",
        side: "",
        checkedIn: false,
        revoked: false,
      },
      {
        id: "2",
        household: "B",
        maxGuests: 3,
        attending: 0,
        response: "PENDING",
        dietary: "",
        contact: "",
        notes: "",
        side: "",
        checkedIn: false,
        revoked: false,
      },
    ]);
    expect(slices.find((s) => s.key === "yes")?.value).toBe(1);
    expect(slices.find((s) => s.key === "pending")?.value).toBe(1);
  });
});
