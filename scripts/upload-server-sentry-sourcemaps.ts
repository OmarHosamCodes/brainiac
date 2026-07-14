#!/usr/bin/env bun
/**
 * Conditionally inject and upload server source maps after a production build.
 * Skips quietly when Sentry build credentials are absent (local builds).
 */

const authToken = Bun.env.SENTRY_AUTH_TOKEN;
const org = Bun.env.SENTRY_ORG;
const project = Bun.env.SENTRY_PROJECT;
const release = Bun.env.SENTRY_RELEASE || Bun.env.RAILWAY_GIT_COMMIT_SHA || Bun.env.SOURCE_COMMIT;

if (!authToken || !org || !project) {
  console.log("Sentry source map upload skipped (missing SENTRY_AUTH_TOKEN/ORG/PROJECT)");
  process.exit(0);
}

const inject = Bun.spawnSync(["bunx", "sentry-cli", "sourcemaps", "inject", "./dist"], {
  cwd: new URL("../apps/server", import.meta.url).pathname,
  stdout: "inherit",
  stderr: "inherit",
  env: Bun.env,
});

if (inject.exitCode !== 0) {
  process.exit(inject.exitCode ?? 1);
}

const uploadArgs = [
  "bunx",
  "sentry-cli",
  "sourcemaps",
  "upload",
  "./dist",
  "--org",
  org,
  "--project",
  project,
];

if (release) {
  uploadArgs.push("--release", release);
}

const upload = Bun.spawnSync(uploadArgs, {
  cwd: new URL("../apps/server", import.meta.url).pathname,
  stdout: "inherit",
  stderr: "inherit",
  env: Bun.env,
});

if (upload.exitCode !== 0) {
  process.exit(upload.exitCode ?? 1);
}

console.log("Sentry server source maps uploaded");
