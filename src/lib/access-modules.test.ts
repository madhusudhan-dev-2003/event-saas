import { describe, expect, it } from "vitest";
import {
  ACCESS_SECTIONS,
  GRANTABLE_PERMISSIONS,
  enabledAccessSections,
  planMemberAccessChange,
  samePermissionSet,
} from "./permissions";

describe("module access", () => {
  it("only lists grantable permissions", () => {
    const keys = ACCESS_SECTIONS.flatMap((section) =>
      section.options.map((option) => option.key),
    );
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every((key) => GRANTABLE_PERMISSIONS.includes(key))).toBe(true);
    expect(keys).not.toContain("billing.manage");
  });

  it("summarizes enabled modules from stored permissions", () => {
    expect(
      enabledAccessSections(["dashboard.view", "events.read", "budget.view"]),
    ).toEqual(["Workspace", "Celebrations", "Budget & vendors"]);
  });

  it("assigns a shared role when permissions are unchanged", () => {
    expect(
      planMemberAccessChange({
        nextRoleIsSystem: true,
        nextRoleMemberCount: 4,
        nextRoleInviteCount: 0,
        currentRoleId: "editor",
        nextRoleId: "viewer",
        currentPermissions: ["events.read"],
        nextPermissions: ["events.read"],
      }),
    ).toBe("assign");
  });

  it("updates a personal custom role in place", () => {
    expect(
      planMemberAccessChange({
        nextRoleIsSystem: false,
        nextRoleMemberCount: 1,
        nextRoleInviteCount: 0,
        currentRoleId: "custom",
        nextRoleId: "custom",
        currentPermissions: ["events.read"],
        nextPermissions: ["events.read", "events.write"],
      }),
    ).toBe("update");
  });

  it("clones access instead of editing a shared role", () => {
    expect(
      planMemberAccessChange({
        nextRoleIsSystem: true,
        nextRoleMemberCount: 3,
        nextRoleInviteCount: 0,
        currentRoleId: "viewer",
        nextRoleId: "viewer",
        currentPermissions: ["events.read"],
        nextPermissions: ["events.read", "guests.manage"],
      }),
    ).toBe("clone");
    expect(samePermissionSet(["a", "b"], ["b", "a"])).toBe(true);
  });
});
