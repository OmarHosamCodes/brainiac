#!/usr/bin/env node

import { readFile } from "node:fs/promises";

import {
  buildInventoryRecords,
  classifications,
  inventoryPath,
  validateCombination,
} from "./generate-golden-file-inventory.mjs";

const artifactHeader =
  "| Path | Domain | Canonical layer | Classification | Owner | Rationale | Evidence |";

export function parseInventory(contents) {
  const errors = [];
  const records = [];
  const artifactSection = contents.split("## Artifacts\n", 2)[1];
  if (!artifactSection) return { records, errors: ["Missing ## Artifacts section"] };
  if (!artifactSection.includes(artifactHeader)) {
    errors.push(`Missing artifact table header: ${artifactHeader}`);
  }
  for (const line of artifactSection.split("\n")) {
    if (!line.startsWith("| `")) continue;
    const cells = line
      .slice(1, line.endsWith("|") ? -1 : undefined)
      .split("|")
      .map((cell) => cell.trim());
    if (cells.length !== 7) {
      errors.push(`Malformed inventory row with ${cells.length} cells: ${line}`);
      continue;
    }
    const pathMatch = cells[0].match(/^`([^`]+)`$/);
    if (!pathMatch) {
      errors.push(`Malformed inventory path cell: ${cells[0]}`);
      continue;
    }
    records.push({
      path: pathMatch[1],
      domain: cells[1],
      layer: cells[2],
      classification: cells[3],
      owner: cells[4],
      rationale: cells[5],
      evidence: cells[6],
    });
  }
  return { records, errors };
}

export function validateInventoryRows(listedRecords, expectedRecords) {
  const errors = [];
  const occurrences = new Map();
  for (const record of listedRecords) {
    occurrences.set(record.path, (occurrences.get(record.path) ?? 0) + 1);
  }
  for (const [path, count] of occurrences) {
    if (count > 1) errors.push(`Duplicate inventory row (${count}): ${path}`);
  }

  const listed = new Map(listedRecords.map((record) => [record.path, record]));
  const expected = new Map(expectedRecords.map((record) => [record.path, record]));
  for (const path of expected.keys()) {
    if (!listed.has(path)) errors.push(`Missing inventory row: ${path}`);
  }
  for (const path of listed.keys()) {
    if (!expected.has(path)) errors.push(`Stale inventory row: ${path}`);
  }

  for (const record of listedRecords) {
    if (!classifications.has(record.classification)) {
      errors.push(`Unknown classification for ${record.path}: ${record.classification}`);
    }
    const combinationError = validateCombination(record);
    if (combinationError) {
      errors.push(
        `Invalid domain/layer/classification combination for ${record.path}: ${combinationError}`,
      );
    }
    if (!record.owner) errors.push(`Missing owner for ${record.path}`);
    if (!record.rationale) errors.push(`Missing rationale for ${record.path}`);
    if (!record.evidence.startsWith("content: ") || !record.evidence.includes("; structure: ")) {
      errors.push(`Evidence must include content and structural signals for ${record.path}`);
    }

    const expectedRecord = expected.get(record.path);
    if (!expectedRecord) continue;
    for (const field of ["domain", "layer", "classification", "owner", "rationale", "evidence"]) {
      if (record[field] !== expectedRecord[field]) {
        errors.push(
          `Semantic mismatch for ${record.path} (${field}): listed "${record[field]}", expected "${expectedRecord[field]}"`,
        );
      }
    }
  }
  return errors;
}

function assertGuard(label, errors, expectedFragment) {
  if (!errors.some((error) => error.includes(expectedFragment))) {
    throw new Error(`${label} guard did not report "${expectedFragment}":\n${errors.join("\n")}`);
  }
}

async function runSelfTest() {
  const [valid] = await buildInventoryRecords();
  assertGuard(
    "duplicate",
    validateInventoryRows([valid, valid], [valid]),
    "Duplicate inventory row",
  );
  assertGuard("missing", validateInventoryRows([], [valid]), "Missing inventory row");
  assertGuard(
    "stale",
    validateInventoryRows([valid, { ...valid, path: "stale/source.ts" }], [valid]),
    "Stale inventory row",
  );
  assertGuard(
    "combination",
    validateInventoryRows(
      [
        {
          ...valid,
          domain: "workspace",
          layer: "static-presentation",
          classification: "static-presentation",
        },
      ],
      [valid],
    ),
    "Invalid domain/layer/classification combination",
  );
  assertGuard(
    "semantic",
    validateInventoryRows([{ ...valid, layer: "domain-logic" }], [valid]),
    "Semantic mismatch",
  );
  console.log(
    "check-golden self-test: duplicate, missing, stale, combination, and semantic mismatch guards passed",
  );
}

async function main() {
  if (process.argv.includes("--self-test")) {
    await runSelfTest();
    return;
  }
  const [contents, expectedRecords] = await Promise.all([
    readFile(inventoryPath, "utf8"),
    buildInventoryRecords(),
  ]);
  const parsed = parseInventory(contents);
  const errors = [...parsed.errors, ...validateInventoryRows(parsed.records, expectedRecords)];
  if (errors.length) {
    console.error(
      `check-golden failed with ${errors.length} inventory error(s):\n${errors.join("\n")}`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `check-golden: ${expectedRecords.length} artifacts semantically validated across ${new Set(expectedRecords.map((record) => record.domain)).size} domains`,
  );
}

await main();
