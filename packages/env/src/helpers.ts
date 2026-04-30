/**
 * Environment Variable Error Helper
 *
 * Provides helpful error messages when environment variables are missing or invalid
 * This runs before the app starts to give developers immediate feedback.
 */

interface EnvCheckResult {
  file: string;
  missing: string[];
  invalid: string[];
  suggestions: string[];
}

/**
 * Check if required environment files exist
 */
export function checkEnvFiles(): EnvCheckResult[] {
  const results: EnvCheckResult[] = [];
  const checks = [
    { path: ".env", name: "Root config" },
    { path: "apps/server/.env", name: "Server config" },
    { path: "apps/web/.env", name: "Web config" },
  ];

  for (const check of checks) {
    try {
      const fs = require("fs");
      if (!fs.existsSync(check.path)) {
        results.push({
          file: check.path,
          missing: [],
          invalid: [],
          suggestions: [
            `Create ${check.path} by copying from:`,
            `  cp ${check.path}.example ${check.path}`,
          ],
        });
      }
    } catch {
      // Ignore errors in checking
    }
  }

  return results;
}

/**
 * Format error message with helpful suggestions
 */
export function formatEnvError(error: Error): string {
  const message = error.message;
  let suggestion = "";

  // Detect common issues and provide specific help
  if (message.includes("DATABASE_URL")) {
    suggestion = `\n💡 To setup the database:\n  1. bun run db:start\n  2. Update DATABASE_URL in .env files`;
  } else if (message.includes("BETTER_AUTH_SECRET")) {
    suggestion = `\n💡 Generate a secret with:\n  openssl rand -hex 16\n  Then set BETTER_AUTH_SECRET in apps/server/.env`;
  } else if (message.includes("OPENROUTER_API_KEY")) {
    suggestion = `\n💡 Get an OpenRouter API key from:\n  https://openrouter.ai/keys\n  Then set OPENROUTER_API_KEY in apps/server/.env`;
  } else if (message.includes("URL must be a valid")) {
    suggestion = `\n💡 URLs must start with http:// or https://\n  Examples:\n  - http://localhost:7000\n  - https://api.example.com`;
  } else if (message.includes("must be at least")) {
    suggestion = `\n💡 This value needs to be longer/stronger\n  Check the .env.example file for details`;
  }

  return `\n❌ Environment Validation Error\n${message}${suggestion}\n\n📖 For more help:\n  • See .env.example for all variables\n  • Run: bun run setup\n`;
}

export function printEnvCheckResults(results: EnvCheckResult[]): void {
  if (results.length === 0) return;

  console.error("\n⚠️  Environment Setup Issues\n");

  for (const result of results) {
    console.error(`📄 ${result.file}:`);

    if (result.suggestions.length > 0) {
      result.suggestions.forEach((s) => console.error(`   ${s}`));
    }
    console.error("");
  }

  console.error("📖 For help:");
  console.error("   Run: bun run setup");
  console.error("   Or read: DEVELOPMENT.md\n");
}
