import { describe, it, expect } from "vitest";
import {
  newPlan,
  occasions,
  planSchema,
  reusePlan,
  dateChanges,
  nextActions,
} from "./planning";
describe("occasion snapshots", () => {
  it.each(occasions.map((o) => o.key))(
    "creates a valid name-only %s plan",
    (key) => {
      const p = newPlan(key);
      expect(planSchema.safeParse(p).success).toBe(true);
      expect(p.date).toBe("");
      expect(
        p.services.every((s) => s.vendors.length === 0 && !s.selectedId),
      ).toBe(true);
    },
  );
  it("rejects unknown occasions", () =>
    expect(() => newPlan("unknown")).toThrow());
  it("keeps birthdays free of academy requirements", () =>
    expect(
      newPlan("birthday").tasks.some((t) =>
        /guru|rehearsal|costume/.test(t.title),
      ),
    ).toBe(false));
  it("creates independent snapshots", () => {
    const a = newPlan("birthday");
    a.tasks[0].title = "Private custom task";
    a.modules.push("preparation");
    expect(newPlan("birthday").tasks[0].title).toBe("Choose a theme");
    expect(newPlan("birthday").modules).toEqual([]);
  });
  it("rejects impossible dates and fractional money", () => {
    const p = newPlan("birthday");
    expect(planSchema.safeParse({ ...p, date: "2026-02-30" }).success).toBe(
      false,
    );
    p.budget[0].paid = 0.1;
    expect(planSchema.safeParse(p).success).toBe(false);
  });
  it("rejects duplicate row IDs", () => {
    const p = newPlan("birthday");
    p.tasks[1].id = p.tasks[0].id;
    expect(planSchema.safeParse(p).success).toBe(false);
  });
  it("cannot claim confirmation without a selected provider", () => {
    const p = newPlan("birthday");
    p.services[0].status = "CONFIRMED";
    expect(planSchema.safeParse(p).success).toBe(false);
  });
  it("cannot select a provider belonging to another service", () => {
    const p = newPlan("birthday");
    p.services[0].selectedId = "foreign";
    expect(planSchema.safeParse(p).success).toBe(false);
  });
});
describe("safe reuse and deadline changes", () => {
  it("does not copy private notes, owners, money, providers or preparation", () => {
    const p = newPlan("wedding");
    p.notes = "Private";
    p.location = "Private address";
    p.date = "2026-10-01";
    p.tasks[0].owner = "Person";
    p.budget[0].paid = 200;
    p.services[0].requirements = "Measurements";
    p.services[0].vendors = [
      {
        id: "vendor",
        name: "Private provider",
        contact: "email",
        quote: 300,
        availability: "AVAILABLE",
        notes: "Private",
      },
    ];
    p.services[0].selectedId = "vendor";
    p.services[0].status = "CONFIRMED";
    p.functions = [
      {
        id: "f",
        name: "Private ceremony",
        date: "",
        time: "",
        venue: "Private",
        notes: "",
      },
    ];
    const c = reusePlan(p);
    expect(c.notes).toBe("");
    expect(c.location).toBe("");
    expect(c.date).toBe("");
    expect(c.tasks[0].owner).toBe("");
    expect(c.tasks[0].status).toBe("NOT_STARTED");
    expect(c.tasks[0].done).toBe(false);
    expect(c.tasks[0].id).not.toBe(p.tasks[0].id);
    expect(c.budget[0].planned).toBe(p.budget[0].planned);
    expect(c.budget[0].committed).toBe(0);
    expect(c.budget[0].paid).toBe(0);
    expect(c.services[0].vendors).toEqual([]);
    expect(c.services[0].status).toBe("SHORTLISTED");
    expect(c.functions).toEqual([]);
    expect(p.notes).toBe("Private");
  });
  it("proposes only relative unfinished deadlines and preserves fixed dates", () => {
    const p = newPlan("birthday");
    p.tasks[0].fixed = true;
    p.tasks[0].due = "2026-09-20";
    p.tasks[1].done = true;
    const changes = dateChanges(p, "2026-10-31");
    expect(
      changes.some((c) => c.id === p.tasks[0].id || c.id === p.tasks[1].id),
    ).toBe(false);
    expect(p.tasks[2].due).toBe("");
    expect(changes[0].after).toBe("2026-10-15");
  });
});
describe("next-action priorities", () => {
  it("prioritizes overdue tasks over missing dates", () => {
    const p = newPlan("birthday");
    p.tasks[1].due = "2026-01-01";
    expect(nextActions(p, "2026-09-14")[0].title).toBe(p.tasks[1].title);
  });
  it("distinguishes a selected vendor from a booking", () => {
    const p = newPlan("birthday");
    p.services[0].status = "SELECTED";
    expect(nextActions(p)[0].section).toBe("Vendors");
    expect(nextActions(p)[0].reason).toContain("confirmation");
  });
  it("does not nag archived events about overdue work", () => {
    const p = newPlan("birthday");
    p.status = "ARCHIVED";
    p.tasks[0].due = "2020-01-01";
    expect(nextActions(p)).toHaveLength(1);
    expect(nextActions(p)[0].section).toBe("Settings");
  });
});
