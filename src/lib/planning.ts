import { z } from "zod";

const text = z.string().trim().max(2000);
const label = z.string().trim().max(160);
export const isoDate = z
  .string()
  .refine(
    (v) =>
      !v ||
      (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
        !Number.isNaN(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v),
    "Enter a valid date.",
  );
const money = z.number().int().min(0).max(100_000_000_000);
export const modules = [
  "functions",
  "seating",
  "food",
  "rehearsals",
  "preparation",
] as const;
export const planSchema = z
  .object({
    date: isoDate,
    location: label,
    notes: text,
    coverUrl: z.preprocess((value) => {
      if (typeof value !== "string") return "";
      const next = value.trim().slice(0, 500);
      if (!next) return "";
      if (next.startsWith("/") && !next.startsWith("//") && !next.includes(".."))
        return next;
      try {
        const url = new URL(next);
        if (url.protocol === "http:" || url.protocol === "https:") return next;
      } catch {
        /* strip unsafe values so older plans still load */
      }
      return "";
    }, z.string()),
    currency: z.enum(["USD", "INR", "GBP", "EUR", "CAD", "AUD"]),
    status: z.enum(["DRAFT", "PLANNING", "COMPLETED", "ARCHIVED"]),
    modules: z.array(z.enum(modules)).max(5),
    tasks: z
      .array(
        z.object({
          id: z.string().min(1),
          title: label.min(1),
          done: z.boolean(),
          owner: label,
          due: isoDate,
          offset: z.number().int().min(-730).max(365).nullable(),
          fixed: z.boolean(),
          category: label.default(""),
          priority: z.enum(["LOW", "NORMAL", "HIGH"]).default("NORMAL"),
          notes: text.default(""),
          status: z
            .enum(["NOT_STARTED", "OPEN", "IN_PROGRESS", "COMPLETED"])
            .optional(),
        }),
      )
      .max(500),
    budget: z
      .array(
        z.object({
          id: z.string().min(1),
          category: label.min(1),
          planned: money,
          committed: money,
          paid: money,
          notes: text.default(""),
          vendor: label.default(""),
          priority: z.enum(["LOW", "NORMAL", "HIGH"]).default("NORMAL"),
          dueDate: isoDate.default(""),
        }),
      )
      .max(500),
    services: z
      .array(
        z.object({
          id: z.string().min(1),
          category: label.min(1),
          requirements: text,
          selectedId: z.string(),
          status: z.enum([
            "SHORTLISTED",
            "SELECTED",
            "CONFIRMED",
            "DELIVERED",
            "PAID",
          ]),
          vendors: z
            .array(
              z.object({
                id: z.string().min(1),
                name: label.min(1),
                contact: label,
                quote: money,
                availability: z.enum(["UNKNOWN", "AVAILABLE", "UNAVAILABLE"]),
                notes: text,
              }),
            )
            .max(30),
        }),
      )
      .max(100),
    functions: z
      .array(
        z.object({
          id: z.string().min(1),
          name: label.min(1),
          date: isoDate,
          time: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/),
          venue: label,
          notes: text,
        }),
      )
      .max(50),
    food: z
      .array(
        z.object({
          id: z.string().min(1),
          dish: label.min(1),
          owner: label,
          dietary: label,
          servings: z.number().int().min(0).max(10000),
        }),
      )
      .max(200),
    preparation: z
      .array(
        z.object({
          id: z.string().min(1),
          participant: label.min(1),
          service: z.enum(["Tailoring", "Jewellery", "Makeup"]),
          units: z.enum(["in", "cm"]),
          details: text,
          fitting: isoDate,
          delivery: isoDate,
        }),
      )
      .max(500),
  })
  .superRefine((p, ctx) => {
    for (const key of [
      "tasks",
      "budget",
      "services",
      "functions",
      "food",
      "preparation",
    ] as const) {
      if (new Set(p[key].map((x) => x.id)).size !== p[key].length)
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Duplicate row identifiers are not allowed.",
        });
    }
    p.services.forEach((s, i) => {
      if (new Set(s.vendors.map((v) => v.id)).size !== s.vendors.length)
        ctx.addIssue({
          code: "custom",
          path: ["services", i],
          message: "Duplicate vendor identifiers.",
        });
      if (s.selectedId && !s.vendors.some((v) => v.id === s.selectedId))
        ctx.addIssue({
          code: "custom",
          path: ["services", i],
          message: "Choose a vendor from this service.",
        });
      if (s.status !== "SHORTLISTED" && !s.selectedId)
        ctx.addIssue({
          code: "custom",
          path: ["services", i],
          message: "Select a vendor before updating the booking status.",
        });
    });
  });
export type Plan = z.infer<typeof planSchema>;
export type PlanTask = Plan["tasks"][number];
export const taskStatuses = [
  "NOT_STARTED",
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
] as const;
export type TaskStatus = (typeof taskStatuses)[number];
export type TaskDisplayStatus = TaskStatus | "OVERDUE";
type Occasion = {
  key: string;
  name: string;
  description: string;
  glyph: string;
  tasks: string[];
  services: string[];
  modules: Plan["modules"];
  color: string;
};
export const occasions: Occasion[] = [
  {
    key: "birthday",
    name: "Birthday",
    description: "A day that feels like them.",
    glyph: "✳",
    color: "peach",
    tasks: [
      "Choose a theme",
      "Plan food and cake",
      "Build the guest list",
      "Choose activities",
    ],
    services: ["Cake", "Catering", "Decor", "Photography"],
    modules: [],
  },
  {
    key: "wedding",
    name: "Wedding",
    description: "Every moment, beautifully together.",
    glyph: "❋",
    color: "rose",
    tasks: [
      "Explore ceremony and reception venues",
      "Create the household guest list",
      "Plan each function",
      "Arrange outfits and fittings",
      "Confirm the ceremony schedule",
    ],
    services: [
      "Venue",
      "Catering",
      "Photography",
      "Tailoring",
      "Jewellery",
      "Makeup",
    ],
    modules: ["functions", "preparation", "seating"],
  },
  {
    key: "arangetram",
    name: "Arangetram",
    description: "A milestone. A shared celebration.",
    glyph: "✺",
    color: "gold",
    tasks: [
      "Coordinate with the guru",
      "Schedule rehearsals",
      "Plan costumes and fittings",
      "Prepare the program",
      "Confirm sound check",
    ],
    services: [
      "Tailoring",
      "Jewellery",
      "Makeup",
      "Orchestra",
      "Photography",
      "Catering",
    ],
    modules: ["rehearsals", "preparation"],
  },
  {
    key: "graduation",
    name: "Graduation",
    description: "Make their next chapter memorable.",
    glyph: "↗",
    color: "sage",
    tasks: [
      "Plan the program",
      "Invite family and friends",
      "Arrange food",
      "Collect milestone photos",
    ],
    services: ["Catering", "Photography"],
    modules: [],
  },
  {
    key: "diwali",
    name: "Diwali",
    description: "Light, connection, and tradition.",
    glyph: "☼",
    color: "gold",
    tasks: [
      "Plan decorations",
      "Arrange food and sweets",
      "Plan optional ceremonies",
      "Invite guests",
    ],
    services: ["Catering", "Decor", "Photography"],
    modules: ["food"],
  },
  {
    key: "gathering",
    name: "Get-together",
    description: "Good company. A simple plan.",
    glyph: "❊",
    color: "sage",
    tasks: ["Choose a date", "Invite friends", "Plan food"],
    services: ["Catering"],
    modules: ["food"],
  },
  {
    key: "halloween",
    name: "Halloween",
    description: "A little spooky. A lot of fun.",
    glyph: "✷",
    color: "peach",
    tasks: ["Choose a theme", "Plan costumes", "Arrange treats", "Plan games"],
    services: ["Decor", "Catering"],
    modules: ["food"],
  },
  {
    key: "thanksgiving",
    name: "Thanksgiving",
    description: "Make room at the table.",
    glyph: "❦",
    color: "gold",
    tasks: [
      "Plan the menu",
      "Assign dishes",
      "Collect dietary needs",
      "Arrange seating",
    ],
    services: ["Catering"],
    modules: ["food", "seating"],
  },
  {
    key: "christmas",
    name: "Christmas",
    description: "Your traditions, brought together.",
    glyph: "✧",
    color: "sage",
    tasks: [
      "Plan food",
      "Organize decorations",
      "Plan an optional gift exchange",
      "Invite guests",
    ],
    services: ["Catering", "Decor"],
    modules: ["food"],
  },
  {
    key: "company",
    name: "Company celebration",
    description: "Bring your people together.",
    glyph: "◈",
    color: "rose",
    tasks: [
      "Agree on the budget",
      "Plan the program",
      "Assign coordinators",
      "Invite participants",
    ],
    services: ["Venue", "Catering", "Photography"],
    modules: ["functions"],
  },
  {
    key: "blank",
    name: "Start from scratch",
    description: "A little space for your own idea.",
    glyph: "+",
    color: "ivory",
    tasks: [],
    services: [],
    modules: [],
  },
];
export function newPlan(key: string): Plan {
  const t = occasions.find((t) => t.key === key);
  if (!t) throw new Error("Choose an available occasion.");
  return {
    date: "",
    location: "",
    notes: "",
    coverUrl: "",
    currency: "USD",
    status: "DRAFT",
    modules: [...t.modules],
    tasks: t.tasks.map((title, i) => ({
      id: crypto.randomUUID(),
      title,
      done: false,
      owner: "",
      due: "",
      offset: -Math.max(1, 30 - i * 7),
      fixed: false,
      category: "",
      priority: "NORMAL" as const,
      notes: "",
      status: "NOT_STARTED" as const,
    })),
    budget: t.services.map((category) => ({
      id: crypto.randomUUID(),
      category,
      planned: 0,
      committed: 0,
      paid: 0,
      notes: "",
      vendor: "",
      priority: "NORMAL" as const,
      dueDate: "",
    })),
    services: t.services.map((category) => ({
      id: crypto.randomUUID(),
      category,
      requirements: "",
      selectedId: "",
      status: "SHORTLISTED",
      vendors: [],
    })),
    functions: [],
    food: [],
    preparation: [],
  };
}
export function reusePlan(source: Plan): Plan {
  return {
    ...newPlan("blank"),
    currency: source.currency,
    coverUrl: source.coverUrl ?? "",
    modules: [...source.modules],
    tasks: source.tasks.map((t) => ({
      ...t,
      id: crypto.randomUUID(),
      done: false,
      owner: "",
      due: "",
      fixed: false,
      category: t.category ?? "",
      priority: t.priority ?? "NORMAL",
      notes: t.notes ?? "",
      status: "NOT_STARTED" as const,
    })),
    budget: source.budget.map((b) => ({
      ...b,
      id: crypto.randomUUID(),
      committed: 0,
      paid: 0,
      notes: b.notes ?? "",
      vendor: b.vendor ?? "",
      priority: b.priority ?? "NORMAL",
      dueDate: b.dueDate ?? "",
    })),
    services: source.services.map((s) => ({
      ...s,
      id: crypto.randomUUID(),
      requirements: "",
      selectedId: "",
      status: "SHORTLISTED",
      vendors: [],
    })),
  };
}
export function dateChanges(plan: Plan, date: string) {
  isoDate.parse(date);
  return plan.tasks
    .filter((t) => !t.fixed && t.offset !== null && !t.done)
    .map((t) => ({
      id: t.id,
      title: t.title,
      before: t.due,
      after: date
        ? new Date(Date.parse(date) + t.offset! * 86400000)
            .toISOString()
            .slice(0, 10)
        : "",
    }))
    .filter((t) => t.before !== t.after);
}
export type NextAction = {
  title: string;
  reason: string;
  section: string;
  prompt: string;
  priority: number;
};
export function nextActions(
  plan: Plan,
  today = new Date().toISOString().slice(0, 10),
): NextAction[] {
  if (["ARCHIVED", "COMPLETED"].includes(plan.status))
    return [
      {
        title: "Keep the good ideas for next time",
        reason:
          "Reuse your structure with private details and commitments cleared.",
        section: "Settings",
        prompt: "Help me reflect on what worked well for this celebration.",
        priority: 1,
      },
    ];
  const result: NextAction[] = [];
  const overdue = plan.tasks.find((t) => !t.done && t.due && t.due < today);
  if (overdue)
    result.push({
      title: overdue.title,
      reason: `This task was due ${overdue.due}. Review it with ${overdue.owner || "its next owner"}.`,
      section: "Plan",
      prompt:
        "Help me recover an overdue preparation without rushing the rest of the plan.",
      priority: 100,
    });
  const selected = plan.services.find((s) => s.status === "SELECTED");
  if (selected)
    result.push({
      title: `Confirm your ${selected.category.toLowerCase()} booking`,
      reason:
        "Your preference is saved. Availability and booking still need confirmation.",
      section: "Vendors",
      prompt: `What should I confirm with a ${selected.category} provider before booking?`,
      priority: 90,
    });
  if (!plan.date)
    result.push({
      title: "Find a day that works",
      reason:
        "A date helps you schedule the preparations. You can keep planning without it.",
      section: "Settings",
      prompt: "Help me choose a date around my guests and preparation time.",
      priority: 70,
    });
  const task = plan.tasks.find((t) => !t.done && t.id !== overdue?.id);
  if (task)
    result.push({
      title: task.title,
      reason: task.owner
        ? `${task.owner} is responsible for this step.`
        : "Make this step easier by choosing someone to help.",
      section: "Plan",
      prompt: `Break this preparation into three practical steps: ${task.title}`,
      priority: 60,
    });
  if (!plan.budget.some((b) => b.planned > 0))
    result.push({
      title: "Give your budget a starting point",
      reason: "Set a comfortable amount before comparing providers.",
      section: "Budget",
      prompt: "Help me divide my celebration budget into useful categories.",
      priority: 50,
    });
  if (!result.length)
    result.push({
      title: "Give your plan a final look",
      reason: "Review the schedule and confirm that everyone knows their role.",
      section: "Plan",
      prompt: "Create a final event-day review checklist.",
      priority: 10,
    });
  return result.sort((a, b) => b.priority - a.priority).slice(0, 3);
}
export function todayIso(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isTaskOverdue(
  task: Pick<PlanTask, "done" | "due">,
  today = todayIso(),
) {
  return !task.done && !!task.due && task.due < today;
}

export function taskWorkflowStatus(task: PlanTask): TaskStatus {
  if (task.done || task.status === "COMPLETED") return "COMPLETED";
  if (
    task.status === "OPEN" ||
    task.status === "IN_PROGRESS" ||
    task.status === "NOT_STARTED"
  ) {
    return task.status;
  }
  return "NOT_STARTED";
}

export function taskDisplayStatus(
  task: PlanTask,
  today = todayIso(),
): TaskDisplayStatus {
  if (taskWorkflowStatus(task) === "COMPLETED") return "COMPLETED";
  if (isTaskOverdue(task, today)) return "OVERDUE";
  return taskWorkflowStatus(task);
}

export function syncTaskCompletion(
  task: PlanTask,
  done: boolean,
): PlanTask {
  return {
    ...task,
    done,
    status: done ? "COMPLETED" : "NOT_STARTED",
  };
}

export function applyTaskStatus(task: PlanTask, status: TaskStatus): PlanTask {
  return {
    ...task,
    status,
    done: status === "COMPLETED",
  };
}

export function planningProgress(tasks: PlanTask[]) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.done).length;
  const inProgressTasks = tasks.filter(
    (t) => !t.done && taskWorkflowStatus(t) === "IN_PROGRESS",
  ).length;
  const openTasks = tasks.filter(
    (t) => !t.done && taskWorkflowStatus(t) === "OPEN",
  ).length;
  const notStartedTasks = tasks.filter(
    (t) => !t.done && taskWorkflowStatus(t) === "NOT_STARTED",
  ).length;
  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    openTasks,
    notStartedTasks,
    progressPercent:
      totalTasks === 0
        ? 0
        : Math.round((completedTasks / totalTasks) * 100),
  };
}

export function formatPlanDate(
  iso: string,
  style: "header" | "table" = "table",
) {
  if (!iso) return "";
  const parts = iso.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return iso;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (Number.isNaN(date.getTime())) return iso;
  if (style === "header") {
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatEventStatus(status: Plan["status"]) {
  if (status === "DRAFT") return "Draft";
  if (status === "PLANNING") return "Planning";
  if (status === "COMPLETED") return "Completed";
  return "Archived";
}

export function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(
    cents / 100,
  );
}
