---
title: Layer 5 — Protected Pages (dashboard, marketplace, billing)
tags: [layer5, pages, nuxt, vue, workspace, marketplace, billing, middleware]
---

# Layer 5 — Protected Pages

All protected pages require `middleware: ["auth", "workspace"]` (or `["auth"]`).

---

## 1. Dashboard — `pages/dashboard.vue`

**Type:** Nuxt Page (Route `/dashboard`)  
**File:** `apps/web/app/pages/dashboard.vue`  
**Middleware:** `auth`, `workspace`

Main workspace board. Renders an `InfiniteCanvas` with draggable/resizable nodes. Fixed left `<aside>` for team management + node sharing. Fixed right panel for `DashboardAgentChatPanel` (toggled by FAB). Lazy-loads `TeamSettingsModal`, `WorkspaceEditorModal`, `WorkspaceAgencyOperatorConnectModal`. Auto-fits all nodes on initial load via `canvasRef.fitAllNodes()`.

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| Root router | Nuxt auto-routing at `/dashboard` |
| `pages/index.vue` | `UButton to="/dashboard"` |
| `composables/useWorkspaceBoard.ts` | `openNodePage` calls `navigateTo("/node/:id")` — returns user here after node page |

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `useWorkspaceBoard()` | destructures: `nodes`, `selectedNodeIds`, `saveBadge`, `saveError`, `workspaceQuery`, `openCreateNode`, `openEditNode`, `connectNodePair`, `disconnectNodePair`, `removeNode`, `submitNodeEditor`, `openCreateAgencyOperatorNode`, `submitCreateAgencyOperatorNode`, `isWorkspaceInitialLoading`, `isWorkspaceRefreshing`, `editorOpen`, `editorMode`, `nodeDraft`, `isDraftValid`, `editorBlockOptions`, `agencyOperatorConnectOpen`, `authSession` |
| `useDashboardLayout()` | reads `isChatVisible`, `isTeamAsideCompact` |
| `useTeamSelection()` | reads `teams`, `selectedTeamId`, `newTeamName`, `teamNameDraft`, `teamListQuery`, `selectedTeam` |
| `useTeamManagement({ teamSelection, workspaceQuery })` | CRUD mutations: `createTeam`, `saveTeamName`, `deleteSelectedTeam`, `addTeamMember`, `updateMemberRole`, `removeMember` + all mutation state refs |
| `useNodeSharing({ teamSelection, workspaceBoard })` | reads `selectedNode`, `selectedNodeTeamRole`, `canManageSelectedNodeSharing`, `shareNodeMutation`, `unshareNodeMutation` |
| `InfiniteCanvas` component | v-model `nodes` + `selectedNodeIds`, emits `create-node`, `edit-node`, `connect-node-pair`, `disconnect-node-pair`, `remove-node`, `open-node` |
| `WorkspaceNodeCard` component | slot `#node` inside `InfiniteCanvas` |
| `LazyTeamSettingsModal` | lazy-loaded, controlled by `isTeamSettingsModalOpen` ref |
| `LazyDashboardAgentChatPanel` | lazy-loaded, shown when `isChatVisible` |
| `LazyWorkspaceEditorModal` | lazy-loaded, controlled by `editorOpen` |
| `LazyWorkspaceAgencyOperatorConnectModal` | lazy-loaded, controlled by `agencyOperatorConnectOpen` |
| `WorkspaceBoardStatus` | receives `badge`, `nodesCount`, `userName` |
| `Header` component | rendered at top |

**Standalone Status:** Not standalone — orchestrates all workspace composables + components.

---

## 2. Marketplace — `pages/marketplace.vue`

**Type:** Nuxt Page (Route `/marketplace`)  
**File:** `apps/web/app/pages/marketplace.vue`  
**Middleware:** `auth`, `workspace`

Infinite-scroll marketplace browser. `useInfiniteQuery` with `orpc.workspace.marketplace.list.infiniteOptions`. Filters by kind (`all` | `node` | `tab` | `block`) and debounced search (300ms). `IntersectionObserver` on sentinel triggers `fetchNextPage`. Opens `MarketplaceImportModal` when user clicks an item card.

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| Root router | Nuxt auto-routing at `/marketplace` |
| `pages/index.vue` | `UButton to="/marketplace"` |
| `Header` | nav link |

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `@brainiac/workspace` | imports `WorkspaceMarketplaceItem` type |
| `@tanstack/vue-query` | `useInfiniteQuery` for paginated marketplace listing |
| `useWorkspaceBoard()` | reads `nodes`, `selectedNodeIds`, `saveBadge`, `saveError`, `workspaceQuery`, `isWorkspaceInitialLoading`, `isWorkspaceRefreshing`, `authSession` |
| `useOrpc()` | calls `orpc.workspace.marketplace.list.infiniteOptions` |
| `MarketplaceItemCard` component | renders each item, emits `insert` event |
| `MarketplaceImportModal` component | modal for choosing import destination |
| `Header` component | rendered at top |
| Native `IntersectionObserver` | infinite scroll sentinel detection |

**Standalone Status:** Not standalone — depends on `useOrpc`, `useWorkspaceBoard`, two marketplace components, TanStack Vue Query.

---

## 3. Billing Portal — `pages/billing/index.vue`

**Type:** Nuxt Page (Route `/billing`)  
**File:** `apps/web/app/pages/billing/index.vue`  
**Middleware:** `auth`  
**Layout:** `default`

Billing management dashboard. Shows current plan (Free/Pro), subscription renewal/end date, and a grid of 8 plan limit items. Buttons: "Manage Subscription" (calls `openPortal`) for Pro non-lifetime, "Upgrade to Pro" (calls `checkout("pro")`) for Free.

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| Root router | Nuxt auto-routing at `/billing` |
| `pages/billing/success.vue` | `UButton to="/billing"` |
| `pages/pricing.vue` | `navigateTo("/billing")` if already Pro |

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `useBilling()` | reads `isPro`, `subscription`, `limits`, calls `checkout`, `openPortal`; uses `billingQuery.isPending` for skeleton |
| `Header` component | rendered at top |
| Nuxt UI (`UCard`, `UButton`, `USkeleton`, `UBadge`, `UIcon`) | UI primitives |

**Standalone Status:** Not standalone — depends on `useBilling`, Header, Nuxt UI.

---

## 4. Billing Success — `pages/billing/success.vue`

**Type:** Nuxt Page (Route `/billing/success`)  
**File:** `apps/web/app/pages/billing/success.vue`  
**Middleware:** `auth`  
**Layout:** `default`

Stripe post-checkout confirmation page. On mount calls `useBilling().refreshBillingState()` to invalidate billing query. Reads `checkout_id` from route query param for display.

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| Stripe checkout redirect | Polar/Stripe redirects here after successful Pro checkout |

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `useBilling()` | calls `refreshBillingState()` on mount → invalidates `orpc.billing.state` query cache |
| Nuxt `useRoute()` | reads `route.query.checkout_id` |
| Nuxt UI (`UButton`, `UIcon`) | navigation buttons |

**Standalone Status:** Not standalone — depends on `useBilling`, Nuxt router, Nuxt UI.
