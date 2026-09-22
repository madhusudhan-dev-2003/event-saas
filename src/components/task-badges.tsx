"use client";

import {
  Building2,
  ClipboardList,
  Music,
  Sparkles,
  Tag,
  Users,
  Utensils,
} from "@/components/icons";
import {
  formatPlanDate,
  taskDisplayStatus,
  type PlanTask,
} from "@/lib/planning";
import { categoryIconKey } from "@/lib/task-board";

export function TaskPriorityBadge({
  priority,
}: {
  priority: PlanTask["priority"];
}) {
  const key = priority ?? "NORMAL";
  const label = key === "HIGH" ? "High" : key === "LOW" ? "Low" : "Medium";
  return (
    <span className={`task-pill task-pill-priority-${key.toLowerCase()}`}>
      {label}
    </span>
  );
}

export function TaskStatusBadge({ task }: { task: PlanTask }) {
  const status = taskDisplayStatus(task);
  const label =
    status === "COMPLETED"
      ? "Completed"
      : status === "IN_PROGRESS"
        ? "In progress"
        : status === "OPEN"
          ? "Open"
          : status === "OVERDUE"
            ? "Overdue"
            : "Not started";
  return (
    <span className={`task-pill task-pill-status-${status.toLowerCase()}`}>
      {label}
    </span>
  );
}

export function TaskCategoryCell({ category }: { category: string }) {
  const key = categoryIconKey(category);
  const Icon =
    key === "food"
      ? Utensils
      : key === "guests"
        ? Users
        : key === "venue"
          ? Building2
          : key === "decor"
            ? Sparkles
            : key === "entertainment"
              ? Music
              : key === "planning"
                ? ClipboardList
                : Tag;
  return (
    <span className="task-category">
      <Icon size={14} strokeWidth={1.8} />
      {category.trim() || "Uncategorized"}
    </span>
  );
}

export function TaskDueCell({ task }: { task: PlanTask }) {
  const overdue = taskDisplayStatus(task) === "OVERDUE";
  if (!task.due) return <span className="task-muted">Not set</span>;
  return (
    <span className={overdue ? "task-due-overdue" : undefined}>
      {formatPlanDate(task.due, "table")}
    </span>
  );
}
