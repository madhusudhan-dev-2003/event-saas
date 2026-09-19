import { describe, expect, it } from "vitest";
import { newPlan } from "./planning";
import { buildSpaceDashboard, type DashboardEvent } from "./space-dashboard";

function event(
  partial: Partial<DashboardEvent> & Pick<DashboardEvent, "id" | "name">,
): DashboardEvent {
  return {
    templateKey: "birthday",
    updatedAt: new Date("2026-09-10T00:00:00Z"),
    plan: newPlan("birthday"),
    guestLinks: [],
    ...partial,
  };
}

const emptyExtras = {
  members: 3,
  pendingInvites: 1,
  roles: 4,
  providers: 12,
  quotes: { total: 2, awaiting: 1, replied: 1 },
};

describe("space dashboard", () => {
  it("counts live RSVPs, overdue tasks, and upcoming dates", () => {
    const plan = newPlan("birthday");
    plan.status = "PLANNING";
    plan.date = "2026-09-30";
    plan.location = "Pune";
    plan.tasks[0].due = "2026-09-01";
    plan.budget[0].planned = 10000;
    plan.budget[0].paid = 2500;
    const view = buildSpaceDashboard(
      [
        event({
          id: "a",
          name: "Anurag birthday",
          plan,
          guestLinks: [
            {
              response: "YES",
              attending: 4,
              maxGuests: 4,
              revokedAt: null,
              checkedIn: true,
            },
            {
              response: "PENDING",
              attending: 0,
              maxGuests: 2,
              revokedAt: null,
              checkedIn: false,
            },
            {
              response: "YES",
              attending: 2,
              maxGuests: 2,
              revokedAt: new Date(),
              checkedIn: false,
            },
          ],
        }),
      ],
      emptyExtras,
      "2026-09-18",
    );
    expect(view.totals.celebrations).toBe(1);
    expect(view.totals.active).toBe(1);
    expect(view.totals.attending).toBe(4);
    expect(view.totals.households).toBe(2);
    expect(view.totals.checkedIn).toBe(1);
    expect(view.totals.overdueTasks).toBe(1);
    expect(view.rsvp.yes).toBe(1);
    expect(view.rsvp.pending).toBe(1);
    expect(view.upcoming[0]?.id).toBe("a");
    expect(view.money.planned).toBe(10000);
    expect(view.attention.some((item) => item.id.startsWith("overdue"))).toBe(
      true,
    );
    expect(view.totals.members).toBe(3);
    expect(view.totals.quotesAwaiting).toBe(1);
  });

  it("uses occasion names and ignores archived events as upcoming", () => {
    const archived = newPlan("halloween");
    archived.status = "ARCHIVED";
    archived.date = "2026-10-31";
    const view = buildSpaceDashboard(
      [event({ id: "h", name: "Hall", templateKey: "halloween", plan: archived })],
      emptyExtras,
      "2026-09-18",
    );
    expect(view.totals.active).toBe(0);
    expect(view.upcoming).toEqual([]);
    expect(view.occasionBars[0]?.label).toBe("Halloween");
  });
});
