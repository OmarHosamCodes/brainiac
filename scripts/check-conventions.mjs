#!/usr/bin/env node
/**
 * Cursor convention checks that oxlint cannot cover.
 * Run via: bun run check:conventions
 */
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SCAN_ROOTS = ["apps", "packages"];

const SKIP_DIRS = new Set(["node_modules", "dist", ".turbo", ".nuxt", ".output"]);

const DYNAMIC_IMPORT_ALLOWLIST = [
  /authenticated-routes\.tsx$/,
  /\/app\.tsx$/,
  /workspace-block-registry\.ts$/,
  /lazy-infinite-canvas\.tsx$/,
  /export-agency-report-xlsx\.ts$/,
  /\.test\.(ts|tsx)$/,
];

// Allowlists for Golden File conventions.
// Each entry maps to the Phase that will resolve/remove it.
const GOLDEN_VIEW_ALLOWLIST = new Set([
  "apps/web/src/features/task-management/task-list/agency-task-list-view.tsx",
  "apps/web/src/features/task-management/work-surface/agency-work-surface-my-tasks-view.tsx",
  "apps/web/src/features/task-management/work-surface/agency-work-surface-task-table-row-view.tsx",
  "apps/web/src/features/time-tracking/entries/agency-time-entry-row-view.tsx",
  "apps/web/src/features/shared/choosers/agency-member-chooser-view.tsx",
]);

const GOLDEN_LIB_STORE_ALLOWLIST = new Set([
  "apps/web/src/stores/workspace.ts",
  "apps/web/src/lib/workspace/use-node-page.ts",
  "apps/web/src/lib/workspace/use-node-sharing.ts",
  "apps/web/src/stores/dashboard-agent-chat.ts",
  "apps/web/src/stores/team.ts",
  "apps/web/src/pages/billing-page.tsx",
  "apps/web/src/pages/marketplace-page.tsx",
  "apps/web/src/pages/login-page.tsx",
  // Workspace files to move in Phase 4
  "apps/web/src/lib/canvas/workspace-flow-adapter.ts",
  "apps/web/src/lib/constants/workspace-node-options.ts",
  "apps/web/src/lib/schemas/workspace-node.ts",
  "apps/web/src/lib/utils/workspace-block-presets.ts",
  "apps/web/src/lib/utils/workspace-block-registry.ts",
  "apps/web/src/lib/utils/workspace-marketplace.ts",
  "apps/web/src/lib/utils/workspace-node-connections.test.ts",
  "apps/web/src/lib/utils/workspace-node-connections.ts",
  "apps/web/src/lib/utils/workspace-node-dashboard.ts",
  "apps/web/src/lib/utils/workspace-node-formatters.ts",
]);

/** @type {{ file: string; line: number; rule: string; detail: string }[]} */
const violations = [];

function normalizePath(filePath) {
  return relative(ROOT, filePath).replaceAll("\\", "/");
}

function isAllowed(filePath, allowlist) {
  const normalized = normalizePath(filePath);
  return allowlist.some((pattern) => pattern.test(normalized));
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      files.push(...(await walk(fullPath)));
      continue;
    }

    if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function scanFile(filePath, content) {
  const normalized = normalizePath(filePath);
  const lines = content.split("\n");
  const isTypeScript = /\.tsx?$/.test(normalized);

  const isViewFile = normalized.endsWith("-view.tsx") || normalized.endsWith("/view.tsx");
  const isRouterFile =
    normalized.startsWith("packages/api/src/routers/") &&
    (normalized.endsWith("/router.ts") ||
      normalized.endsWith("/index.ts") ||
      normalized.endsWith("Router.ts"));
  const isGenericFeatureUtil =
    normalized.startsWith("apps/web/src/features/") &&
    (normalized.endsWith("/utils.ts") ||
      normalized.endsWith("/helpers.ts") ||
      normalized.endsWith("/data.ts") ||
      normalized.endsWith("/utils.tsx") ||
      normalized.endsWith("/helpers.tsx") ||
      normalized.endsWith("/data.tsx"));

  if (isGenericFeatureUtil) {
    violations.push({
      file: normalized,
      line: 1,
      rule: "golden-no-generic-utils",
      detail: "Generic utils/helpers/data files inside features are blocked",
    });
  }

  const isUnderLibOrStores =
    normalized.startsWith("apps/web/src/lib/") || normalized.startsWith("apps/web/src/stores/");
  const hasFeaturePrefix =
    /^(agency|workspace|agent|team)-/.test(normalized.split("/").pop() || "") ||
    normalized.includes("/workspace/") ||
    normalized.includes("/queries/agency") ||
    normalized.startsWith("apps/web/src/stores/workspace") ||
    normalized.startsWith("apps/web/src/stores/dashboard-agent-chat") ||
    normalized.startsWith("apps/web/src/stores/team");

  if (isUnderLibOrStores && hasFeaturePrefix && !GOLDEN_LIB_STORE_ALLOWLIST.has(normalized)) {
    violations.push({
      file: normalized,
      line: 1,
      rule: "golden-no-feature-lib-store",
      detail: "Feature-specific file must live inside features/ folder, not lib/ or stores/",
    });
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNumber = index + 1;
    const trimmed = line.trim();

    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
      continue;
    }

    if (line.includes("await import(") && !isAllowed(filePath, DYNAMIC_IMPORT_ALLOWLIST)) {
      violations.push({
        file: normalized,
        line: lineNumber,
        rule: "no-inline-imports",
        detail: "Dynamic await import() outside allowlist",
      });
    }

    if (
      isTypeScript &&
      /import\s*\([^)]+\)\s*\.(?!then\b)/.test(line) &&
      !line.trimStart().startsWith("*") &&
      !line.trimStart().startsWith("//")
    ) {
      violations.push({
        file: normalized,
        line: lineNumber,
        rule: "no-inline-imports",
        detail: "Inline import() type reference",
      });
    }

    if (/\bpnpm\b/.test(line) || /\bnpm run\b/.test(line) || /\byarn\b/.test(line)) {
      violations.push({
        file: normalized,
        line: lineNumber,
        rule: "bun-only",
        detail: "Use bun run instead of other package managers",
      });
    }

    if (
      normalized.startsWith("apps/web/src/") &&
      normalized.endsWith(".tsx") &&
      /className=\{[^}]*\.join\(" "\)/.test(line)
    ) {
      violations.push({
        file: normalized,
        line: lineNumber,
        rule: "cn-classname",
        detail: 'Use cn() instead of className={[...].join(" ")}',
      });
    }

    if (isViewFile && !GOLDEN_VIEW_ALLOWLIST.has(normalized)) {
      const isImport = trimmed.startsWith("import ");
      const isTypeImport = trimmed.startsWith("import type") || /\bimport\s+type\s+/.test(line);

      if (isImport && !isTypeImport) {
        const importsQueryOrOrpc =
          trimmed.includes("@tanstack/react-query") ||
          trimmed.includes("@tanstack/vue-query") ||
          trimmed.includes("@tanstack/query") ||
          trimmed.includes("@/lib/orpc") ||
          trimmed.includes("@orpc/") ||
          trimmed.includes("orpcClient") ||
          trimmed.includes("zustand");
        const importsStore = trimmed.includes("/stores/") || trimmed.includes("@/stores/");

        if (importsQueryOrOrpc) {
          violations.push({
            file: normalized,
            line: lineNumber,
            rule: "golden-view-no-query-orpc",
            detail: "View file cannot import TanStack Query, oRPC or Zustand directly",
          });
        }
        if (importsStore) {
          violations.push({
            file: normalized,
            line: lineNumber,
            rule: "golden-view-no-stores",
            detail: "View file cannot import feature or global stores directly",
          });
        }
      }
    }

    if (isRouterFile) {
      const isImport = trimmed.startsWith("import ");
      if (isImport) {
        const importsDbOrDrizzle =
          trimmed.includes("@brainiac/db") || trimmed.includes("drizzle-orm");
        const importsStore = trimmed.includes("/stores/") || trimmed.includes("@/stores/");

        if (importsDbOrDrizzle) {
          violations.push({
            file: normalized,
            line: lineNumber,
            rule: "golden-router-no-db",
            detail: "Router file cannot import DB or Drizzle directly",
          });
        }
        if (importsStore) {
          violations.push({
            file: normalized,
            line: lineNumber,
            rule: "golden-router-no-stores",
            detail: "Router file cannot import feature or global stores directly",
          });
        }
      }
    }
  }
}

async function main() {
  for (const scanRoot of SCAN_ROOTS) {
    const rootPath = join(ROOT, scanRoot);
    const files = await walk(rootPath);

    for (const filePath of files) {
      const content = await readFile(filePath, "utf8");
      scanFile(filePath, content);
    }
  }

  if (violations.length === 0) {
    console.log("check-conventions: ok");
    return;
  }

  console.error(`check-conventions: ${violations.length} violation(s)\n`);
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line} [${violation.rule}] ${violation.detail}`);
  }
  process.exit(1);
}

await main();
