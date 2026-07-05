import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const internalApiPort = Number(process.env.INTERNAL_API_PORT || 3001);
const publicPort = Number(process.env.PORT || 7001);
const internalApiUrl = `http://127.0.0.1:${internalApiPort}`;

const children = [];

function spawnTracked(command, args, options) {
  const child = spawn(command, args, {
    ...options,
    stdio: "inherit",
  });
  children.push(child);
  return child;
}

async function waitForApi() {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${internalApiUrl}/`);
      if (response.ok) {
        return;
      }
    } catch {
      // API still booting.
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }

  throw new Error(`API did not become ready at ${internalApiUrl}`);
}

function shutdown(signal) {
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

console.log(`Starting API on ${internalApiUrl}`);
spawnTracked("bun", ["run", "start"], {
  cwd: resolve(root, "apps/server"),
  env: {
    ...process.env,
    PORT: String(internalApiPort),
    HOST: "127.0.0.1",
  },
});

await waitForApi();
console.log("API ready");

console.log(`Starting web on port ${publicPort}`);
const web = spawnTracked("node", [".output/server/index.mjs"], {
  cwd: resolve(root, "apps/web"),
  env: {
    ...process.env,
    PORT: String(publicPort),
    INTERNAL_API_URL: internalApiUrl,
  },
});

web.on("exit", (code, signal) => {
  shutdown("SIGTERM");
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
