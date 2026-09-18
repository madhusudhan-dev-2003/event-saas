import {
  isTaskOverdue,
  taskWorkflowStatus,
  todayIso,
  type PlanTask,
  type TaskDisplayStatus,
  type TaskStatus,
} from "./planning";

export const TASK_CATEGORY_OPTIONS = [
  "Planning",
  "Venue",
  "Guests",
  "Food & Catering",
  "Decor & Theme",
  "Entertainment",
  "Attire",
  "Program",
  "Other",
] as const;

export type TaskSort = "due" | "priority" | "recent" | "name";

export type TaskBoardFilters = {
  query: string;
  status: "all" | TaskDisplayStatus;
  priority: "all" | "HIGH" | "NORMAL" | "LOW";
  category: "all" | "uncategorized" | string;
  owner: "all" | "unassigned" | string;
  sort: TaskSort;
};

const PRIORITY_RANK = { HIGH: 0, NORMAL: 1, LOW: 2 } as const;

export function ownerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function categoryIconKey(category: string) {
  const value = category.toLowerCase();
  if (/food|cake|cater/.test(value)) return "food";
  if (/guest/.test(value)) return "guests";
  if (/venue|location/.test(value)) return "venue";
  if (/decor|theme/.test(value)) return "decor";
  if (/entertain|music|program/.test(value)) return "entertainment";
  if (/plan/.test(value)) return "planning";
  return "other";
}

export function filterAndSortTasks(
  tasks: PlanTask[],
  filters: TaskBoardFilters,
  today = todayIso(),
) {
  const q = filters.query.trim().toLowerCase();
  const filtered = tasks.filter((task) => {
    const matchesQuery =
      !q ||
      task.title.toLowerCase().includes(q) ||
      (task.category ?? "").toLowerCase().includes(q) ||
      task.owner.toLowerCase().includes(q) ||
      (task.notes ?? "").toLowerCase().includes(q);
    const workflow = taskWorkflowStatus(task);
    const statusOk =
      filters.status === "all"
        ? true
        : filters.status === "OVERDUE"
          ? isTaskOverdue(task, today)
          : filters.status === "COMPLETED"
            ? workflow === "COMPLETED"
            : workflow === filters.status;
    const matchesPriority =
      filters.priority === "all" ||
      (task.priority ?? "NORMAL") === filters.priority;
    const category = task.category ?? "";
    const matchesCategory =
      filters.category === "all" ||
      (filters.category === "uncategorized" && !category.trim()) ||
      category === filters.category;
    const owner = task.owner.trim();
    const matchesOwner =
      filters.owner === "all" ||
      (filters.owner === "unassigned" && !owner) ||
      owner === filters.owner;
    return (
      matchesQuery &&
      statusOk &&
      matchesPriority &&
      matchesCategory &&
      matchesOwner
    );
  });

  const indexed = filtered.map((task) => ({
    task,
    index: tasks.findIndex((t) => t.id === task.id),
  }));

  indexed.sort((a, b) => {
    if (filters.sort === "name") {
      return a.task.title.localeCompare(b.task.title);
    }
    if (filters.sort === "priority") {
      return (
        PRIORITY_RANK[a.task.priority ?? "NORMAL"] -
        PRIORITY_RANK[b.task.priority ?? "NORMAL"]
      );
    }
    if (filters.sort === "recent") {
      return b.index - a.index;
    }
    const aDue = a.task.due || "9999-12-31";
    const bDue = b.task.due || "9999-12-31";
    if (aDue === bDue) return a.index - b.index;
    return aDue.localeCompare(bDue);
  });

  return indexed;
}

export function uniqueTaskCategories(tasks: PlanTask[]) {
  return [
    ...new Set(
      tasks.map((t) => t.category.trim()).filter((value) => value.length > 0),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function uniqueTaskOwners(tasks: PlanTask[]) {
  return [
    ...new Set(
      tasks.map((t) => t.owner.trim()).filter((value) => value.length > 0),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function suggestionToTaskTitle(suggestion: string) {
  const cleaned = suggestion.replace(/^[-*]\s+/, "").trim();
  const first = cleaned.split(/[.!?]/)[0]?.trim() || cleaned;
  return first.slice(0, 160);
}
