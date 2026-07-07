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

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNumber = index + 1;

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
