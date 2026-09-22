import { describe, expect, it } from "vitest";
import { newPlan, planSchema, reusePlan } from "./planning";
import {
  applyTaskStatus,
  isTaskOverdue,
  planningProgress,
  syncTaskCompletion,
  taskDisplayStatus,
  taskWorkflowStatus,
} from "./planning";
import {
  filterAndSortTasks,
  suggestionToTaskTitle,
  type TaskBoardFilters,
} from "./task-board";

function task(
  overrides: Partial<ReturnType<typeof newPlan>["tasks"][number]> = {},
) {
  return {
    id: crypto.randomUUID(),
    title: "Task",
    done: false,
    owner: "",
    due: "",
    offset: -7,
    fixed: false,
    category: "",
    priority: "NORMAL" as const,
    notes: "",
    ...overrides,
  };
}

const baseFilters: TaskBoardFilters = {
  query: "",
  status: "all",
  priority: "all",
  category: "all",
  owner: "all",
  sort: "due",
};

describe("planning progress", () => {
  it("is 0% with no tasks", () => {
    expect(planningProgress([]).progressPercent).toBe(0);
  });
  it("is 25% when 4 of 16 are done", () => {
    const tasks = Array.from({ length: 16 }, (_, i) =>
      task({ done: i < 4, status: i < 4 ? "COMPLETED" : "NOT_STARTED" }),
    );
    expect(planningProgress(tasks)).toMatchObject({
      completedTasks: 4,
      totalTasks: 16,
      progressPercent: 25,
    });
  });
  it("is 100% when all complete", () => {
    const tasks = [task({ done: true, status: "COMPLETED" })];
    expect(planningProgress(tasks).progressPercent).toBe(100);
  });
});

describe("legacy task status", () => {
  it("treats done=true without status as COMPLETED", () => {
    const legacy = task({ done: true });
    delete (legacy as { status?: string }).status;
    expect(taskWorkflowStatus(legacy)).toBe("COMPLETED");
    expect(planSchema.safeParse({ ...newPlan("blank"), tasks: [legacy] }).success).toBe(
      true,
    );
  });
  it("treats unfinished tasks without status as NOT_STARTED", () => {
    const legacy = task({ done: false, due: "2099-01-01" });
    delete (legacy as { status?: string }).status;
    expect(taskWorkflowStatus(legacy)).toBe("NOT_STARTED");
  });
  it("COMPLETED synchronizes done=true", () => {
    expect(applyTaskStatus(task(), "COMPLETED").done).toBe(true);
  });
  it("non-completed status synchronizes done=false", () => {
    expect(applyTaskStatus(task({ done: true }), "IN_PROGRESS").done).toBe(
      false,
    );
  });
  it("checkbox completion sets COMPLETED", () => {
    expect(syncTaskCompletion(task(), true)).toMatchObject({
      done: true,
      status: "COMPLETED",
    });
  });
});

describe("overdue is derived", () => {
  it("marks unfinished past due dates overdue without storing OVERDUE", () => {
    const overdue = task({ due: "2020-01-01", done: false });
    expect(isTaskOverdue(overdue, "2026-09-17")).toBe(true);
    expect(taskDisplayStatus(overdue, "2026-09-17")).toBe("OVERDUE");
    expect(overdue.status).not.toBe("OVERDUE");
  });
  it("does not mark completed tasks overdue", () => {
    expect(
      isTaskOverdue(task({ due: "2020-01-01", done: true }), "2026-09-17"),
    ).toBe(false);
  });
});

describe("task board filters and sort", () => {
  const tasks = [
    task({
      id: "a",
      title: "Choose a theme",
      category: "Planning",
      owner: "Anurag",
      due: "2026-09-20",
      priority: "HIGH",
      notes: "palette",
      status: "COMPLETED",
      done: true,
    }),
    task({
      id: "b",
      title: "Book venue",
      category: "Venue",
      owner: "Maya",
      due: "2026-09-12",
      status: "OPEN",
    }),
    task({
      id: "c",
      title: "Plan entertainment",
      category: "Entertainment",
      due: "",
      status: "NOT_STARTED",
    }),
  ];

  it("searches title, category, owner, and notes", () => {
    expect(
      filterAndSortTasks(tasks, { ...baseFilters, query: "palette" }).map(
        (r) => r.task.id,
      ),
    ).toEqual(["a"]);
    expect(
      filterAndSortTasks(tasks, { ...baseFilters, query: "venue" }).map(
        (r) => r.task.id,
      ),
    ).toEqual(["b"]);
  });
  it("filters by status including overdue", () => {
    expect(
      filterAndSortTasks(
        tasks,
        { ...baseFilters, status: "COMPLETED" },
        "2026-09-17",
      ).map((r) => r.task.id),
    ).toEqual(["a"]);
    expect(
      filterAndSortTasks(
        tasks,
        { ...baseFilters, status: "OVERDUE" },
        "2026-09-17",
      ).map((r) => r.task.id),
    ).toEqual(["b"]);
  });
  it("filters priority, category, and owner", () => {
    expect(
      filterAndSortTasks(tasks, { ...baseFilters, priority: "HIGH" }).map(
        (r) => r.task.id,
      ),
    ).toEqual(["a"]);
    expect(
      filterAndSortTasks(tasks, { ...baseFilters, category: "Venue" }).map(
        (r) => r.task.id,
      ),
    ).toEqual(["b"]);
    expect(
      filterAndSortTasks(tasks, { ...baseFilters, owner: "unassigned" }).map(
        (r) => r.task.id,
      ),
    ).toEqual(["c"]);
  });
  it("sorts by due date with empty dates last", () => {
    expect(
      filterAndSortTasks(tasks, { ...baseFilters, sort: "due" }).map(
        (r) => r.task.id,
      ),
    ).toEqual(["b", "a", "c"]);
  });
  it("sorts by name", () => {
    expect(
      filterAndSortTasks(tasks, { ...baseFilters, sort: "name" }).map(
        (r) => r.task.title,
      ),
    ).toEqual(["Book venue", "Choose a theme", "Plan entertainment"]);
  });
});

describe("reuse and suggestions", () => {
  it("resets reused task status", () => {
    const plan = newPlan("birthday");
    plan.tasks[0].done = true;
    plan.tasks[0].status = "COMPLETED";
    plan.tasks[0].owner = "Anurag";
    const copy = reusePlan(plan);
    expect(copy.tasks[0].done).toBe(false);
    expect(copy.tasks[0].status).toBe("NOT_STARTED");
    expect(copy.tasks[0].owner).toBe("");
  });
  it("turns a suggestion into a short title", () => {
    expect(
      suggestionToTaskTitle("Confirm the bakery three weeks out. Call them."),
    ).toBe("Confirm the bakery three weeks out");
  });
});
