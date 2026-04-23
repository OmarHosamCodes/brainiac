---
title: Layer 5 — Core Components (Header, UserMenu, LegalPageShell, InfiniteCanvas)
tags: [layer5, components, vue, canvas, header, layout]
---

# Layer 5 — Core Components

## 1. `Header.vue`

**Type:** Vue Component  
**File:** `apps/web/app/components/Header.vue`

Floating pill navigation bar. Fixed, centered, z-50. Contains: home logo link (`/`), two nav items (Dashboard, Marketplace) with active-state highlight, dark mode toggle (`UColorModeButton`), and `UserMenu`. Active state computed from `useRoute().path`.

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `pages/index.vue` | rendered in template |
| `pages/dashboard.vue` | rendered in template |
| `pages/marketplace.vue` | rendered in template |
| `pages/pricing.vue` | rendered in template |
| `pages/billing/index.vue` | rendered in template |
| `pages/billing/success.vue` | rendered in template (via layout) |

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `UserMenu.vue` | rendered in template |
| Nuxt `useRoute()` | reads `route.path` for active nav state |
| Nuxt UI (`ULink`, `UIcon`, `UColorModeButton`) | nav links + icons + dark mode toggle |

**Standalone Status:** Not standalone — depends on `UserMenu`, Nuxt router, Nuxt UI.

---

## 2. `UserMenu.vue`

**Type:** Vue Component  
**File:** `apps/web/app/components/UserMenu.vue`

User account dropdown menu. Shows profile info, settings link, and sign out button.

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `Header.vue` | rendered in template |

**Standalone Status:** Not standalone — depends on auth composable for session/sign-out.

---

## 3. `LegalPageShell.vue`

**Type:** Vue Component  
**File:** `apps/web/app/components/LegalPageShell.vue`

Layout wrapper for legal pages. Accepts props: `title`, `summary`, `effectiveDate`, `lastUpdated`, `sections` (array of `{ id, title, paragraphs?, bullets?, intro? }`). Renders a structured document layout.

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `pages/privacy.vue` | passes 10 sections as props |
| `pages/terms.vue` | passes ToS sections as props |

**Standalone Status:** Not standalone — depends on Nuxt UI for styling primitives.

---

## 4. `InfiniteCanvas.vue`

**Type:** Vue Component  
**File:** `apps/web/app/components/InfiniteCanvas.vue`

Full infinite canvas engine component. Wraps `useCanvas(viewportRef)` for camera/pan/zoom logic. Renders:
- CSS grid background (dot pattern via `gridStyle`)
- Connection lines (SVG `<path>` bezier curves between orchestrator → standard nodes)
- Node slots via scoped `#node` slot (renders `WorkspaceNodeCard` instances)
- Context menus for canvas/node/connection right-click
- Resize handles (8 directions) + drag interactions per node

### Key Props
| Prop | Type | Description |
|---|---|---|
| `nodes` (v-model) | `CanvasNodeModel[]` | Node positions + metadata |
| `selectedNodeIds` (v-model) | `string[]` | Currently selected node IDs |
| `loading` | `boolean` | Shows skeleton overlay |

### Emitted Events
`create-node`, `create-agency-operator-node`, `edit-node`, `connect-node-pair`, `disconnect-node-pair`, `remove-node`, `open-node`

### Exposed Methods
`fitAllNodes()` — computes bounding box of all nodes and animates camera to fit viewport

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `pages/dashboard.vue` | `ref="canvasRef"`, v-model bindings + event handlers |

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `useCanvas(viewportRef)` | pan/zoom/camera engine |
| `~/utils/workspace-node-dashboard` | `getWorkspaceNodeTintOption`, `getWorkspaceNodeTintStyle` |
| `~/utils/workspace-node-connections` | `getCanonicalConnectionPair`, `getEligibleConnectionTargetIds` |
| `@nuxt/ui` | `ContextMenuItem` type |
| Vue `computed`, `onBeforeUnmount`, `onMounted`, `ref`, `useTemplateRef`, `watch` | reactivity + lifecycle |

**Standalone Status:** Not standalone — depends on `useCanvas`, two utility modules, Nuxt UI types.
