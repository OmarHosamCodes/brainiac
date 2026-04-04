import { beforeEach, mock } from "bun:test";

type Ref<T> = {
    value: T;
};

function createRef<T>(value: T): Ref<T> {
    return { value };
}

function createComputed<T>(getter: () => T): Ref<T> {
    return {
        get value() {
            return getter();
        },
    } as Ref<T>;
}

function createReactive<T extends object>(value: T): T {
    return value;
}

function resolveWatchSource<T>(source: Ref<T> | (() => T)): T {
    return typeof source === "function" ? source() : source.value;
}

function createWatch<T>(
    source: Ref<T> | (() => T),
    callback: (value: T, previousValue: T | undefined) => void,
    options?: { immediate?: boolean },
) {
    if (options?.immediate) {
        callback(resolveWatchSource(source), undefined);
    }

    return () => undefined;
}

function createNextTick(callback?: () => void | Promise<void>) {
    return Promise.resolve().then(async () => {
        if (callback) {
            await callback();
        }
    });
}

type TeamRole = "owner" | "editor" | "viewer";

type TeamSummary = {
    id: string;
    name: string;
    role: TeamRole;
    createdByUserId: string;
    updatedAt: string;
};

type TeamMember = {
    teamId: string;
    userId: string;
    userName: string;
    userEmail: string;
    role: TeamRole;
    joinedAt: string;
    updatedAt: string;
};

type TeamDetail = TeamSummary & {
    members: TeamMember[];
};

type MutationHandler = (input: unknown) => Promise<unknown>;
type QueryResult = {
    data: Ref<unknown>;
    error: Ref<unknown>;
    isFetching: Ref<boolean>;
    isLoading: Ref<boolean>;
    isRefetching: Ref<boolean>;
    refetch: () => Promise<unknown>;
    status: Ref<string>;
};

type TeamManagementTestRuntime = {
    authSession: Ref<{ data: { user: { id: string } } | null }>;
    mutationHandlers: MutationHandler[];
    mutationIndex: number;
    queryResult: QueryResult | null;
    queryCache: Map<string, unknown>;
    toastEvents: Array<{
        title?: string;
        description?: string;
        color?: string;
    }>;
    orpc: ReturnType<typeof createOrpcMock>;
};

function createOrpcMock() {
    return {
        team: {
            list: {
                queryOptions: () => ({
                    queryKey: ["team", "list"],
                }),
            },
            get: {
                queryOptions: ({ input }: { input: { teamId: string } }) => ({
                    queryKey: ["team", "get", { teamId: input.teamId }],
                }),
            },
            create: {
                mutationOptions: () => ({}),
            },
            update: {
                mutationOptions: () => ({}),
            },
            delete: {
                mutationOptions: () => ({}),
            },
            members: {
                add: {
                    mutationOptions: () => ({}),
                },
                updateRole: {
                    mutationOptions: () => ({}),
                },
                remove: {
                    mutationOptions: () => ({}),
                },
            },
        },
    };
}

function getQueryCacheKey(queryKey: unknown) {
    return JSON.stringify(queryKey);
}

const runtime: TeamManagementTestRuntime = {
    authSession: createRef({
        data: {
            user: {
                id: "user-1",
            },
        },
    }),
    mutationHandlers: [],
    mutationIndex: 0,
    queryResult: null,
    queryCache: new Map(),
    toastEvents: [],
    orpc: createOrpcMock(),
};

mock.module("vue", () => ({
    computed: createComputed,
    nextTick: createNextTick,
    onScopeDispose: () => undefined,
    reactive: createReactive,
    ref: createRef,
    watch: createWatch,
}));

const queryClient = {
    getQueryData<T>(queryKey: unknown) {
        return runtime.queryCache.get(getQueryCacheKey(queryKey)) as T | undefined;
    },
    setQueryData<T>(
        queryKey: unknown,
        value: T | ((current: T | undefined) => T | undefined),
    ) {
        const key = getQueryCacheKey(queryKey);
        const current = runtime.queryCache.get(key) as T | undefined;
        const next = typeof value === "function" ? (value as (value: T | undefined) => T | undefined)(current) : value;

        runtime.queryCache.set(key, next);

        return next;
    },
    async invalidateQueries() {
        return undefined;
    },
};

function nextMutationHandler() {
    const next = runtime.mutationHandlers[runtime.mutationIndex];

    runtime.mutationIndex += 1;

    if (!next) {
        return async (input: unknown) => input;
    }

    return next;
}

mock.module("@tanstack/vue-query", () => ({
    useMutation: () => {
        const handler = nextMutationHandler();

        return {
            mutateAsync: (input: unknown) => handler(input),
            mutate: async (input: unknown, options?: { onError?: () => void }) => {
                try {
                    await handler(input);
                } catch {
                    options?.onError?.();
                }
            },
            isPending: createRef(false),
        };
    },
    useQuery: () =>
        runtime.queryResult ?? {
            data: createRef(undefined),
            error: createRef(null),
            isFetching: createRef(false),
            isLoading: createRef(false),
            isRefetching: createRef(false),
            refetch: async () => undefined,
            status: createRef("success"),
        },
    useQueryClient: () => queryClient,
}));

(globalThis as any).__teamManagementTestRuntime = runtime;
(globalThis as any).useAuthSession = () => runtime.authSession;
(globalThis as any).useOrpc = () => runtime.orpc;
(globalThis as any).useToast = () => ({
    add: (payload: { title?: string; description?: string; color?: string }) => {
        runtime.toastEvents.push(payload);
    },
});

beforeEach(() => {
    runtime.mutationHandlers = [];
    runtime.mutationIndex = 0;
    runtime.queryResult = null;
    runtime.queryCache.clear();
    runtime.toastEvents = [];
    runtime.authSession.value = {
        data: {
            user: {
                id: "user-1",
            },
        },
    };
    runtime.orpc = createOrpcMock();
});

export type { QueryResult, TeamDetail, TeamManagementTestRuntime, TeamMember, TeamRole, TeamSummary };
