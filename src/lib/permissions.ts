export const PERMISSIONS = [
  "dashboard.view",
  "events.read",
  "events.write",
  "events.delete",
  "schedule.manage",
  "guests.manage",
  "guests.checkin",
  "budget.view",
  "budget.manage",
  "vendors.manage",
  "vendors.quotes",
  "exports.download",
  "providers.browse",
  "settings.manage",
  "users.invite",
  "users.manage",
  "billing.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  "dashboard.view": "View dashboard and KPIs",
  "events.read": "View celebrations",
  "events.write": "Create and edit celebrations",
  "events.delete": "Delete celebrations",
  "schedule.manage": "Manage event schedule and functions",
  "guests.manage": "Manage guest list and RSVP links",
  "guests.checkin": "Check guests in on event day",
  "budget.view": "View budget figures",
  "budget.manage": "Edit budget and payments",
  "vendors.manage": "Manage services and providers",
  "vendors.quotes": "Request and review private quotes",
  "exports.download": "Download and export plans",
  "providers.browse": "Browse provider directory",
  "settings.manage": "Manage space settings",
  "users.invite": "Invite people to the space",
  "users.manage": "Manage users and custom roles",
  "billing.manage": "Manage billing and subscription",
};

export const PERMISSION_GROUPS: {
  title: string;
  keys: Permission[];
}[] = [
  {
    title: "Workspace",
    keys: ["dashboard.view", "settings.manage", "providers.browse", "exports.download"],
  },
  {
    title: "Celebrations",
    keys: ["events.read", "events.write", "events.delete", "schedule.manage"],
  },
  {
    title: "Guests",
    keys: ["guests.manage", "guests.checkin"],
  },
  {
    title: "Money and vendors",
    keys: ["budget.view", "budget.manage", "vendors.manage", "vendors.quotes"],
  },
  {
    title: "People and access",
    keys: ["users.invite", "users.manage"],
  },
];

export const ALL_PERMISSIONS: Permission[] = [...PERMISSIONS];

const OWNER_PERMISSIONS = ALL_PERMISSIONS;
const ADMIN_PERMISSIONS: Permission[] = ALL_PERMISSIONS.filter(
  (p) => p !== "billing.manage",
);
const EDITOR_PERMISSIONS: Permission[] = [
  "dashboard.view",
  "events.read",
  "events.write",
  "schedule.manage",
  "guests.manage",
  "guests.checkin",
  "budget.view",
  "budget.manage",
  "vendors.manage",
  "vendors.quotes",
  "exports.download",
  "providers.browse",
];
const VIEWER_PERMISSIONS: Permission[] = [
  "dashboard.view",
  "events.read",
  "budget.view",
  "providers.browse",
];

export const SYSTEM_ROLE_DEFS = [
  { key: "OWNER", name: "Owner", permissions: OWNER_PERMISSIONS },
  { key: "ADMIN", name: "Administrator", permissions: ADMIN_PERMISSIONS },
  { key: "EDITOR", name: "Editor", permissions: EDITOR_PERMISSIONS },
  { key: "VIEWER", name: "Viewer", permissions: VIEWER_PERMISSIONS },
] as const;

export type SystemRoleKey = (typeof SYSTEM_ROLE_DEFS)[number]["key"];

export function parsePermissions(value: unknown): Permission[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<string>(PERMISSIONS);
  return value.filter(
    (p): p is Permission => typeof p === "string" && allowed.has(p),
  );
}

export function can(
  permissions: readonly string[] | null | undefined,
  permission: Permission,
): boolean {
  if (!permissions?.length) return false;
  if (permissions.includes(permission)) return true;
  // Broader permissions imply related finer ones
  if (
    permission === "guests.checkin" &&
    permissions.includes("guests.manage")
  )
    return true;
  if (permission === "budget.view" && permissions.includes("budget.manage"))
    return true;
  if (
    permission === "vendors.quotes" &&
    permissions.includes("vendors.manage")
  )
    return true;
  if (permission === "users.invite" && permissions.includes("users.manage"))
    return true;
  if (
    permission === "schedule.manage" &&
    permissions.includes("events.write")
  )
    return true;
  return false;
}

export function canAny(
  permissions: readonly string[] | null | undefined,
  needed: Permission[],
): boolean {
  return needed.some((p) => can(permissions, p));
}

export const ACCESS_SECTIONS: {
  id: string;
  title: string;
  description: string;
  options: { key: Permission; title: string; hint: string }[];
}[] = [
  {
    id: "workspace",
    title: "Workspace",
    description: "Home, settings, and shared directories",
    options: [
      {
        key: "dashboard.view",
        title: "Dashboard",
        hint: "See the space overview and KPIs",
      },
      {
        key: "settings.manage",
        title: "Space settings",
        hint: "Change space name and workspace options",
      },
      {
        key: "providers.browse",
        title: "Provider directory",
        hint: "Browse published providers",
      },
      {
        key: "exports.download",
        title: "Export plans",
        hint: "Download saved celebration JSON",
      },
    ],
  },
  {
    id: "celebrations",
    title: "Celebrations",
    description: "Event list, details, and planning",
    options: [
      {
        key: "events.read",
        title: "View celebrations",
        hint: "Open the board and event pages",
      },
      {
        key: "events.write",
        title: "Edit celebrations",
        hint: "Create events and change plans",
      },
      {
        key: "schedule.manage",
        title: "Manage schedule",
        hint: "Edit functions and rehearsal timing",
      },
      {
        key: "events.delete",
        title: "Delete celebrations",
        hint: "Permanently remove events in this space",
      },
    ],
  },
  {
    id: "guests",
    title: "Guests",
    description: "Household lists, RSVP links, and check-in",
    options: [
      {
        key: "guests.manage",
        title: "Manage guests",
        hint: "Edit households and private RSVP links",
      },
      {
        key: "guests.checkin",
        title: "Check guests in",
        hint: "Mark attendance on the day",
      },
    ],
  },
  {
    id: "money",
    title: "Budget & vendors",
    description: "Money, bookings, and quotes",
    options: [
      {
        key: "budget.view",
        title: "View budget",
        hint: "See planned, committed, and paid amounts",
      },
      {
        key: "budget.manage",
        title: "Edit budget",
        hint: "Change categories and payments",
      },
      {
        key: "vendors.manage",
        title: "Manage vendors",
        hint: "Edit services and provider shortlists",
      },
      {
        key: "vendors.quotes",
        title: "Vendor quotes",
        hint: "Send and review private quote links",
      },
    ],
  },
  {
    id: "people",
    title: "People & access",
    description: "Who can join this space",
    options: [
      {
        key: "users.invite",
        title: "Invite people",
        hint: "Create invitation links",
      },
      {
        key: "users.manage",
        title: "Manage users and roles",
        hint: "Change roles and module access",
      },
    ],
  },
];

export function enabledAccessSections(permissions: readonly string[]) {
  return ACCESS_SECTIONS.filter((section) =>
    section.options.some((option) => can(permissions, option.key)),
  ).map((section) => section.title);
}

export function samePermissionSet(a: readonly string[], b: readonly string[]) {
  if (a.length !== b.length) return false;
  const other = new Set(b);
  return a.every((item) => other.has(item));
}

export function planMemberAccessChange(input: {
  nextRoleIsSystem: boolean;
  nextRoleMemberCount: number;
  nextRoleInviteCount: number;
  currentRoleId: string;
  nextRoleId: string;
  currentPermissions: readonly string[];
  nextPermissions: readonly string[];
}) {
  const samePerms = samePermissionSet(
    input.currentPermissions,
    input.nextPermissions,
  );
  const assignedOnlyToThisMember =
    input.nextRoleId === input.currentRoleId
      ? input.nextRoleMemberCount <= 1 && input.nextRoleInviteCount === 0
      : input.nextRoleMemberCount === 0 && input.nextRoleInviteCount === 0;
  if (samePerms) return "assign" as const;
  if (!input.nextRoleIsSystem && assignedOnlyToThisMember) return "update" as const;
  return "clone" as const;
}
export const GRANTABLE_PERMISSIONS: Permission[] = ALL_PERMISSIONS.filter(
  (p) => p !== "billing.manage",
);

export function legacyRoleKey(name: string): SystemRoleKey | null {
  const upper = name.trim().toUpperCase();
  if (
    upper === "OWNER" ||
    upper === "ADMIN" ||
    upper === "EDITOR" ||
    upper === "VIEWER"
  ) {
    return upper;
  }
  const match = SYSTEM_ROLE_DEFS.find(
    (r) => r.name.toLowerCase() === name.trim().toLowerCase(),
  );
  return match?.key ?? null;
}
