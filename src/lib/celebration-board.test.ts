import { describe, expect, it } from "vitest";
import { newPlan, planSchema } from "./planning";
import {
  celebrationCover,
  celebrationKpis,
  daysUntil,
  guestCapacity,
  kpiDelta,
  nextCelebration,
  sortCelebrations,
  taskProgress,
  type CelebrationRecord,
} from "./celebration-board";

function record(
  partial: Partial<CelebrationRecord> & Pick<CelebrationRecord, "id" | "name">,
): CelebrationRecord {
  const plan = newPlan("birthday");
  return {
    templateKey: "birthday",
    createdAt: new Date("2026-09-01T00:00:00Z"),
    updatedAt: new Date("2026-09-10T00:00:00Z"),
    plan,
    guestLinks: [],
    ...partial,
  };
}

describe("celebration board helpers", () => {
  it("loads old plans without coverUrl", () => {
    const plan = newPlan("birthday") as Record<string, unknown>;
    delete plan.coverUrl;
    expect(planSchema.parse(plan).coverUrl).toBe("");
  });

  it("strips unsafe cover URLs", () => {
    const plan = { ...newPlan("birthday"), coverUrl: "javascript:alert(1)" };
    expect(planSchema.parse(plan).coverUrl).toBe("");
  });

  it("uses custom cover URLs when present", () => {
    expect(celebrationCover("birthday", "https://cdn.example/x.jpg")).toBe(
      "https://cdn.example/x.jpg",
    );
    expect(celebrationCover("birthday")).toBe("/covers/birthday.png");
  });

  it("summarizes task progress from real task rows", () => {
    const plan = newPlan("birthday");
    expect(taskProgress(plan).label).toBe("Not started yet");
    plan.tasks.forEach((task) => {
      task.done = true;
    });
    expect(taskProgress(plan).label).toBe("All tasks completed!");
  });

  it("counts invited guests from household maxGuests", () => {
    expect(
      guestCapacity([
        { maxGuests: 4, attending: 2 },
        { maxGuests: 3, attending: 0 },
      ]),
    ).toBe(7);
  });

  it("computes KPIs without inventing status history", () => {
    const now = new Date("2026-09-18T12:00:00Z");
    const rows = [
      record({
        id: "a",
        name: "A",
        createdAt: new Date("2026-09-02T00:00:00Z"),
        plan: { ...newPlan("birthday"), status: "PLANNING", date: "2026-09-30" },
      }),
      record({
        id: "b",
        name: "B",
        createdAt: new Date("2026-08-02T00:00:00Z"),
        updatedAt: new Date("2026-09-05T00:00:00Z"),
        plan: { ...newPlan("birthday"), status: "COMPLETED", date: "2026-08-01" },
      }),
    ];
    const kpi = celebrationKpis(rows, now);
    expect(kpi.all).toBe(2);
    expect(kpi.createdThisMonth).toBe(1);
    expect(kpi.upcomingThisMonth).toBe(1);
    expect(kpi.completedThisMonth).toBe(1);
    expect(kpiDelta(0)).toBe("No change");
    expect(kpiDelta(2)).toBe("+2 this month");
  });

  it("picks the soonest dated open celebration", () => {
    const next = nextCelebration(
      [
        record({
          id: "later",
          name: "Later",
          plan: { ...newPlan("birthday"), status: "PLANNING", date: "2026-12-01" },
        }),
        record({
          id: "soon",
          name: "Soon",
          plan: { ...newPlan("birthday"), status: "DRAFT", date: "2026-10-01" },
        }),
        record({
          id: "done",
          name: "Done",
          plan: { ...newPlan("birthday"), status: "COMPLETED", date: "2026-09-20" },
        }),
      ],
      "2026-09-18",
    );
    expect(next?.id).toBe("soon");
    expect(daysUntil("2026-09-20", "2026-09-18")).toBe(2);
  });

  it("sorts by date with undated events last", () => {
    const sorted = sortCelebrations(
      [
        record({
          id: "none",
          name: "None",
          plan: { ...newPlan("birthday"), date: "" },
        }),
        record({
          id: "first",
          name: "First",
          plan: { ...newPlan("birthday"), date: "2026-01-01" },
        }),
      ],
      "soonest",
    );
    expect(sorted.map((row) => row.id)).toEqual(["first", "none"]);
  });
});
