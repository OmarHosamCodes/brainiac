import { describe, expect, test } from "bun:test";

import "../../test/setup";

async function getUseTeamManagement() {
    const module = await import("./useTeamManagement");

    return module.useTeamManagement;
}

type Ref<T> = {
    value: T;
};

function createRef<T>(value: T): Ref<T> {
    return { value };
}

function createDeferred<T = unknown>() {
    let resolve: ((value: T) => void) | null = null;
    let reject: ((reason?: unknown) => void) | null = null;

    const promise = new Promise<T>((promiseResolve, promiseReject) => {
        resolve = promiseResolve;
        reject = promiseReject;
    });

    return {
        promise,
        resolve: (value: T) => {
            if (resolve) {
                resolve(value);
            }
        },
        reject: (reason?: unknown) => {
            if (reject) {
                reject(reason);
            }
        },
    };
}

type TeamRole = "owner" | "editor" | "viewer";

type TeamMember = {
    teamId: string;
    userId: string;
    userName: string;
    userEmail: string;
    role: TeamRole;
    joinedAt: string;
    updatedAt: string;
};

type TeamDetail = {
    id: string;
    name: string;
    role: TeamRole;
    createdByUserId: string;
    updatedAt: string;
    members: TeamMember[];
};

type TeamManagementTestRuntime = {
    mutationHandlers: Array<(input: unknown) => Promise<unknown>>;
    queryCache: Map<string, unknown>;
    toastEvents: Array<{ title?: string; description?: string; color?: string }>;
};

function getRuntime() {
    return (globalThis as any).__teamManagementTestRuntime as TeamManagementTestRuntime;
}

function getTeamDetail(teamId: string) {
    return getRuntime().queryCache.get(JSON.stringify(["team", "get", { teamId }])) as TeamDetail;
}

function setTeamDetail(team: TeamDetail) {
    getRuntime().queryCache.set(JSON.stringify(["team", "get", { teamId: team.id }]), team);
}

function setTeamList(teams: TeamDetail[]) {
    getRuntime().queryCache.set(
        JSON.stringify(["team", "list"]),
        {
            items: teams.map((team) => ({
                id: team.id,
                name: team.name,
                role: team.role,
                createdByUserId: team.createdByUserId,
                updatedAt: team.updatedAt,
            })),
        },
    );
}

function createMutationHandlers(overrides: {
    updateRole?: (input: unknown) => Promise<unknown>;
    removeMember?: (input: unknown) => Promise<unknown>;
} = {}) {
    return [
        async (input: unknown) => input,
        async (input: unknown) => {
            const payload = input as { teamId: string; name: string };

            return {
                id: payload.teamId,
                name: payload.name,
                role: "owner",
                createdByUserId: "user-1",
                updatedAt: new Date().toISOString(),
            };
        },
        async (input: unknown) => {
            const payload = input as { teamId: string };

            return {
                teamId: payload.teamId,
                deleted: true,
            };
        },
        async (input: unknown) => {
            const payload = input as { teamId: string; userEmail: string; role: TeamRole };

            return {
                teamId: payload.teamId,
                userId: "member-new",
                userName: "New Member",
                userEmail: payload.userEmail,
                role: payload.role,
                joinedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
        },
        overrides.updateRole ?? (async (input: unknown) => input),
        overrides.removeMember ??
        (async (input: unknown) => {
            const payload = input as { teamId: string; userId: string };

            return {
                teamId: payload.teamId,
                userId: payload.userId,
                removed: true,
            };
        }),
    ];
}

function createTeamSelection(role: TeamRole) {
    const selectedTeam = createRef<TeamDetail | null>({
        id: "team-1",
        name: "Alpha Team",
        role,
        createdByUserId: "user-1",
        updatedAt: new Date().toISOString(),
        members: [
            {
                teamId: "team-1",
                userId: "user-1",
                userName: "Owner",
                userEmail: "owner@example.com",
                role: "owner",
                joinedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                teamId: "team-1",
                userId: "user-2",
                userName: "Viewer",
                userEmail: "viewer@example.com",
                role: "viewer",
                joinedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        ],
    });

    return {
        teamListQuery: {
            refetch: async () => ({ items: [] }),
        },
        teamDetailQuery: {
            refetch: async () => selectedTeam.value,
        },
        teams: createRef([]),
        selectedTeam,
        selectedTeamId: createRef("team-1"),
        newTeamName: createRef(""),
        teamNameDraft: createRef("Alpha Team"),
        refreshTeamData: async () => undefined,
    };
}

describe("useTeamManagement", () => {
    test("computes owner-only RBAC flags", async () => {
        const useTeamManagement = await getUseTeamManagement();
        const runtime = getRuntime();
        runtime.mutationHandlers = createMutationHandlers();

        const teamSelection = createTeamSelection("owner");
        setTeamDetail(teamSelection.selectedTeam.value as TeamDetail);
        setTeamList([teamSelection.selectedTeam.value as TeamDetail]);

        const management = useTeamManagement({
            teamSelection: teamSelection as any,
            workspaceQuery: {
                refetch: async () => undefined,
            },
        });

        expect(management.canInvite.value).toBeTrue();
        expect(management.canDeleteTeam.value).toBeTrue();
        expect(management.canModifyRoles.value).toBeTrue();
        expect(management.canRemoveMembers.value).toBeTrue();
    });

    test("returns false RBAC flags for non-owner roles", async () => {
        const useTeamManagement = await getUseTeamManagement();
        const runtime = getRuntime();
        runtime.mutationHandlers = createMutationHandlers();

        const teamSelection = createTeamSelection("viewer");
        setTeamDetail(teamSelection.selectedTeam.value as TeamDetail);
        setTeamList([teamSelection.selectedTeam.value as TeamDetail]);

        const management = useTeamManagement({
            teamSelection: teamSelection as any,
            workspaceQuery: {
                refetch: async () => undefined,
            },
        });

        expect(management.canInvite.value).toBeFalse();
        expect(management.canDeleteTeam.value).toBeFalse();
        expect(management.canModifyRoles.value).toBeFalse();
        expect(management.canRemoveMembers.value).toBeFalse();
    });

    test("exposes queryClient for optimistic cache updates", async () => {
        const useTeamManagement = await getUseTeamManagement();
        const runtime = getRuntime();
        runtime.mutationHandlers = createMutationHandlers();

        const teamSelection = createTeamSelection("owner");
        setTeamDetail(teamSelection.selectedTeam.value as TeamDetail);
        setTeamList([teamSelection.selectedTeam.value as TeamDetail]);

        const management = useTeamManagement({
            teamSelection: teamSelection as any,
            workspaceQuery: {
                refetch: async () => undefined,
            },
        });

        expect(typeof management.queryClient.setQueryData).toBe("function");
        expect(typeof management.queryClient.getQueryData).toBe("function");
    });

    test("optimistically updates member roles before the mutation resolves", async () => {
        const useTeamManagement = await getUseTeamManagement();
        const runtime = getRuntime();
        const deferred = createDeferred<unknown>();

        runtime.mutationHandlers = createMutationHandlers({
            updateRole: () => deferred.promise,
        });

        const teamSelection = createTeamSelection("owner");
        setTeamDetail(teamSelection.selectedTeam.value as TeamDetail);
        setTeamList([teamSelection.selectedTeam.value as TeamDetail]);

        const management = useTeamManagement({
            teamSelection: teamSelection as any,
            workspaceQuery: {
                refetch: async () => undefined,
            },
        });

        const updatePromise = management.updateMemberRole("user-2", "editor");

        expect(getTeamDetail("team-1").members.find((member) => member.userId === "user-2")?.role).toBe(
            "editor",
        );

        deferred.resolve({
            teamId: "team-1",
            userId: "user-2",
            role: "editor",
        });

        await updatePromise;

        expect(getTeamDetail("team-1").members.find((member) => member.userId === "user-2")?.role).toBe(
            "editor",
        );
    });

    test("optimistically removes members and rolls back on failure", async () => {
        const useTeamManagement = await getUseTeamManagement();
        const runtime = getRuntime();
        const deferred = createDeferred<unknown>();

        runtime.mutationHandlers = createMutationHandlers({
            removeMember: () => deferred.promise,
        });

        const teamSelection = createTeamSelection("owner");
        setTeamDetail(teamSelection.selectedTeam.value as TeamDetail);
        setTeamList([teamSelection.selectedTeam.value as TeamDetail]);

        const management = useTeamManagement({
            teamSelection: teamSelection as any,
            workspaceQuery: {
                refetch: async () => undefined,
            },
        });

        const removePromise = management.removeMember("user-2");

        expect(getTeamDetail("team-1").members.some((member) => member.userId === "user-2")).toBeFalse();

        deferred.reject(new Error("Failed"));
        await removePromise;

        expect(getTeamDetail("team-1").members.some((member) => member.userId === "user-2")).toBeTrue();
        expect(runtime.toastEvents.at(-1)?.title).toBe("Failed to remove member");
    });
});
