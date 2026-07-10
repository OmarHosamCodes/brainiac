#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const registry = JSON.parse(
  await readFile(join(root, "docs/golden-file-realtime-integration-registry.json"), "utf8"),
);
const liveSource = await readFile(
  join(root, "packages/api/src/routers/agency-ops/live/live.ts"),
  "utf8",
);
const sourceEvents = [...liveSource.matchAll(/type:\s*z\.literal\("([^"]+)"\)/g)].map(
  (match) => match[1],
);
const registryEvents = registry.events.map((event) => event.type);
const missing = sourceEvents.filter((event) => !registryEvents.includes(event));
const stale = registryEvents.filter((event) => !sourceEvents.includes(event));
const incomplete = registry.events
  .filter(
    (event) =>
      !event.producer ||
      !event.consumer ||
      !event.notification ||
      !Array.isArray(event.tests) ||
      event.tests.length === 0,
  )
  .map((event) => event.type);

if (missing.length || stale.length || incomplete.length) {
  if (missing.length) console.error(`Missing registry events: ${missing.join(", ")}`);
  if (stale.length) console.error(`Stale registry events: ${stale.join(", ")}`);
  if (incomplete.length) console.error(`Incomplete registry entries: ${incomplete.join(", ")}`);
  process.exit(1);
}

console.log(`check-realtime: ${sourceEvents.length} live events registered`);
