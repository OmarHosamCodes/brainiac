#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverDir = resolve(__dirname, "..");

function run(command: string, args: string[]) {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: serverDir,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} ${args.join(" ")} failed (${code})`));
    });
  });
}

async function main() {
  console.log("Seeding massive workspace data...");
  await run("bun", ["run", "src/operations/seeds/seed.ts", "--scale", "massive"]);

  console.log("Seeding massive agency data...");
  await run("bun", ["run", "src/operations/seeds/seed-agency.ts", "--yes", "--scale", "massive"]);

  console.log("Granting lifetime pro to founder...");
  await run("bun", [
    "run",
    "src/operations/maintenance/grant-lifetime-pro.ts",
    "--",
    "--email",
    "founder@brainiac.test",
  ]);

  console.log("Massive seed complete.");
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
