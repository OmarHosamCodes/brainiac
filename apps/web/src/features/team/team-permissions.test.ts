import { describe, expect, test } from "bun:test";

import { deriveTeamPermissions } from "./team-permissions";

describe("deriveTeamPermissions", () => {
  test("only owners can manage members and delete a team", () => {
    expect(deriveTeamPermissions("owner")).toEqual({
      canInvite: true,
      canDeleteTeam: true,
      canModifyRoles: true,
      canRemoveMembers: true,
      canManageSelectedTeam: true,
    });
  });

  test("non-owners cannot perform management actions", () => {
    for (const role of ["editor", "viewer", null] as const) {
      expect(deriveTeamPermissions(role)).toEqual({
        canInvite: false,
        canDeleteTeam: false,
        canModifyRoles: false,
        canRemoveMembers: false,
        canManageSelectedTeam: false,
      });
    }
  });
});
