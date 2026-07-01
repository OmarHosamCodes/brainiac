import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const AUDIT_RUNS = Number(process.env.PERF_AUDIT_RUNS ?? 3);

/**
 * @param {import('lighthouse').Result} lhr
 */
function extractMetrics(lhr) {
  const audits = lhr.audits ?? {};
  const lcp = audits["largest-contentful-paint"]?.numericValue ?? null;
  const cls = audits["cumulative-layout-shift"]?.numericValue ?? null;
  const inp =
    audits["interaction-to-next-paint"]?.numericValue ??
    audits["experimental-interaction-to-next-paint"]?.numericValue ??
    audits["total-blocking-time"]?.numericValue ??
    null;
  const lighthouseScore = (lhr.categories?.performance?.score ?? 0) * 100;

  return { lcpMs: lcp, inpMs: inp, cls, lighthouseScore };
}

/**
 * @param {number[]} values
 */
function median(values) {
  const sorted = values.filter((value) => value != null && !Number.isNaN(value)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * @param {Record<string, number | null>[]} runs
 */
function medianMetrics(runs) {
  return {
    lcpMs: median(runs.map((run) => run.lcpMs)),
    inpMs: median(runs.map((run) => run.inpMs)),
    cls: median(runs.map((run) => run.cls)),
    lighthouseScore: median(runs.map((run) => run.lighthouseScore)),
  };
}

/**
 * @param {'mobile' | 'desktop'} throttling
 */
function lighthouseConfig(throttling) {
  return {
    extends: "lighthouse:default",
    settings: {
      onlyCategories: ["performance"],
      formFactor: throttling === "mobile" ? "mobile" : "desktop",
      screenEmulation:
        throttling === "mobile"
          ? { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false }
          : { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
      throttling:
        throttling === "mobile"
          ? {
              rttMs: 150,
              throughputKbps: 1638.4,
              cpuSlowdownMultiplier: 4,
              requestLatencyMs: 562.5,
              downloadThroughputKbps: 1474.56,
              uploadThroughputKbps: 675,
            }
          : {
              rttMs: 40,
              throughputKbps: 10240,
              cpuSlowdownMultiplier: 1,
              requestLatencyMs: 0,
              downloadThroughputKbps: 0,
              uploadThroughputKbps: 0,
            },
    },
  };
}

/**
 * @param {string | null | undefined} storageStatePath
 */
export async function cookiesForStorageState(storageStatePath) {
  if (!storageStatePath) return null;
  const raw = JSON.parse(await readFile(storageStatePath, "utf8"));
  return raw.cookies ?? [];
}

/**
 * @param {import('playwright').Cookie[]} cookies
 */
export function formatCookieHeader(cookies) {
  if (!cookies || cookies.length === 0) return null;
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

/**
 * @param {{
 *   url: string;
 *   throttling: 'mobile' | 'desktop';
 *   cookieHeader?: string | null;
 * }} options
 */
export async function auditRoute({ url, throttling, cookieHeader = null }) {
  const config = lighthouseConfig(throttling);
  const runs = [];
  const chromePath = chromium.executablePath();

  for (let attempt = 0; attempt < AUDIT_RUNS; attempt += 1) {
    const chrome = await chromeLauncher.launch({
      chromePath,
      chromeFlags: ["--headless=new", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage"],
    });

    try {
      const result = await lighthouse(
        url,
        {
          port: chrome.port,
          output: "json",
          logLevel: "error",
          extraHeaders: cookieHeader ? { Cookie: cookieHeader } : undefined,
        },
        config,
      );

      if (!result?.lhr) {
        throw new Error(`Lighthouse returned no report for ${url}`);
      }

      runs.push(extractMetrics(result.lhr));
    } finally {
      try {
        await chrome.kill();
      } catch {
        // ponytail: chrome-launcher may throw EBADF if Chrome already exited
      }
    }
  }

  return medianMetrics(runs);
}
