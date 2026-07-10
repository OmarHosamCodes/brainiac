import { spawn } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import pg from "pg";

import budgets from "../../apps/web/perf/budgets.json" with { type: "json" };
import { runGlobalSetup, storageStatePath } from "../../apps/web/perf/global-setup.mjs";
import { buildReport, writeBaselineFromReport, writeReports } from "../../apps/web/perf/report.mjs";
import { resolveRoutes } from "../../apps/web/perf/routes.mjs";
import {
  auditRoute,
  cookiesForStorageState,
  formatCookieHeader,
} from "../../apps/web/perf/run-lighthouse.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..");
const perfDir = resolve(root, "apps/web/perf");
const webDist = resolve(root, "apps/web/dist");
const baselinePath = resolve(perfDir, "baseline.json");

const PERF_ENV = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://postgres:password@localhost:5440/orch",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "perf-benchmark-secret-key-32chars!",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:7001",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:7001",
  VITE_PUBLIC_SERVER_URL: process.env.VITE_PUBLIC_SERVER_URL ?? "http://localhost:7001",
  NODE_ENV: "production",
  PORT: process.env.PORT ?? "7001",
  INTERNAL_API_PORT: process.env.INTERNAL_API_PORT ?? "3001",
};

const args = process.argv.slice(2);
const ci = args.includes("--ci");
const updateBaseline = args.includes("--update-baseline");
const skipSetup = args.includes("--skip-setup");
const baseUrl = process.env.PERF_BASE_URL ?? "http://localhost:7001";

/** @type {import('node:child_process').ChildProcess[]} */
const children = [];

function run(command, commandArgs, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: options.cwd ?? root,
      env: { ...PERF_ENV, ...options.env },
      stdio: options.inherit === false ? "pipe" : "inherit",
    });
    children.push(child);

    let stdout = "";
    let stderr = "";
    if (options.inherit === false) {
      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
      } else {
        reject(new Error(`${command} ${commandArgs.join(" ")} failed (${code})\n${stderr}`));
      }
    });
  });
}

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function waitForUrl(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // retry
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function getSeedNodeId(databaseUrl) {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const result = await client.query(
      "SELECT nodes->0->>'id' AS id FROM dashboard_workspace LIMIT 1",
    );
    return result.rows[0]?.id ?? null;
  } finally {
    await client.end();
  }
}

async function measureBundle(distDir) {
  const assetsDir = join(distDir, "assets");
  const files = await readdir(assetsDir);
  let jsGzip = 0;
  let cssGzip = 0;

  for (const file of files) {
    const content = await readFile(join(assetsDir, file));
    const gzipped = gzipSync(content).length;
    if (file.endsWith(".js")) jsGzip += gzipped;
    if (file.endsWith(".css")) cssGzip += gzipped;
  }

  const jsGzipKb = Math.round(jsGzip / 1024);
  const cssGzipKb = Math.round(cssGzip / 1024);
  const jsRatio = Math.max(0, Math.min(1, budgets.bundle.jsGzipKb / Math.max(jsGzipKb, 1)));
  const cssRatio = Math.max(0, Math.min(1, budgets.bundle.cssGzipKb / Math.max(cssGzipKb, 1)));
  const ratio = (jsRatio + cssRatio) / 2;
  const pass = jsGzipKb <= budgets.bundle.jsGzipKb && cssGzipKb <= budgets.bundle.cssGzipKb;

  return { jsGzipKb, cssGzipKb, pass, ratio };
}

async function loadBaseline() {
  try {
    const raw = await readFile(baselinePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function main() {
  console.log(`Performance benchmarks (${ci ? "CI" : "full"})`);

  if (!skipSetup) {
    console.log("Starting database...");
    await run("bun", ["run", "db:start"], { cwd: root });

    console.log("Building production bundle...");
    await run("bun", ["run", "build"], { cwd: root });

    console.log("Pushing schema...");
    await run("bunx", ["drizzle-kit", "push", "--force"], {
      cwd: resolve(root, "packages/db"),
      inherit: false,
    });

    console.log("Seeding database...");
    await run("bun", ["run", "db:seed:massive"], { cwd: resolve(root, "apps/server") });
  }

  const bundleResult = await measureBundle(webDist);
  console.log(`Bundle: JS ${bundleResult.jsGzipKb} KB gzip, CSS ${bundleResult.cssGzipKb} KB gzip`);

  let serversStarted = false;
  if (!skipSetup) {
    try {
      await waitForUrl(`${baseUrl}/`, 3_000);
      console.log(`Using existing server at ${baseUrl}`);
    } catch {
      console.log("Starting production servers...");
      const startChild = spawn("bun", ["run", "start"], {
        cwd: root,
        env: PERF_ENV,
        stdio: "inherit",
        detached: false,
      });
      children.push(startChild);
      serversStarted = true;
      await waitForUrl(`${baseUrl}/`);
    }
  } else {
    await waitForUrl(`${baseUrl}/`);
  }

  const nodeId = await getSeedNodeId(PERF_ENV.DATABASE_URL);
  if (!nodeId) {
    console.warn("No seeded workspace node found; skipping /node/:id audit");
  }

  console.log("Authenticating benchmark user...");
  await runGlobalSetup({ baseUrl });
  const authCookies = await cookiesForStorageState(storageStatePath);
  const authCookieHeader = formatCookieHeader(authCookies);

  const routes = resolveRoutes({ ci, nodeId });
  /** @type {Array<Record<string, unknown>>} */
  const routeResults = [];

  for (const route of routes) {
    const tier = budgets.tiers[route.tier];
    const url = `${baseUrl}${route.path}`;
    console.log(`Auditing ${route.displayPath} (${tier.throttling})...`);

    const metrics = await auditRoute({
      url,
      throttling: tier.throttling,
      cookieHeader: route.auth ? authCookieHeader : null,
    });

    routeResults.push({
      id: route.id,
      displayPath: route.displayPath,
      tier: route.tier,
      ...metrics,
    });

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  }

  const baseline = await loadBaseline();
  const report = buildReport({
    ci,
    baseUrl,
    budgets,
    bundleResult,
    routeResults,
    baseline: baseline?.routes ? { routes: baseline.routes } : null,
  });

  const { jsonPath, mdPath } = await writeReports(report, perfDir);
  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);

  if (updateBaseline) {
    const updated = await writeBaselineFromReport(report, baselinePath);
    console.log(`Updated baseline at ${baselinePath}`);

    const jsBudget = Math.ceil(updated.bundle.jsGzipKb * 1.05);
    const cssBudget = Math.ceil(updated.bundle.cssGzipKb * 1.05);
    console.log(`Suggested budgets (+5%): JS ${jsBudget} KB, CSS ${cssBudget} KB`);

    const budgetsPath = resolve(perfDir, "budgets.json");
    const budgetsRaw = JSON.parse(await readFile(budgetsPath, "utf8"));
    budgetsRaw.bundle.jsGzipKb = jsBudget;
    budgetsRaw.bundle.cssGzipKb = cssBudget;
    await writeFile(budgetsPath, `${JSON.stringify(budgetsRaw, null, 2)}\n`, "utf8");
    console.log(`Updated ${budgetsPath}`);

    if (serversStarted) shutdown();
    console.log("Baseline capture complete.");
    return;
  }

  if (serversStarted) shutdown();

  if (!report.pass) {
    console.error("Performance benchmarks failed:");
    for (const failure of report.failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }

  console.log("All performance benchmarks passed.");
}

main().catch((error) => {
  if (children.length > 0) shutdown();
  console.error(error);
  process.exit(1);
});
