import { db } from "@brainiac/db";
import { user } from "@brainiac/db/schema/auth";
import { eq } from "drizzle-orm";

type CliOptions = {
  email: string | null;
  help: boolean;
};

function parseCliArgs(argv: string[]): CliOptions {
  let email: string | null = null;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (!argument) {
      continue;
    }

    if (argument === "--help" || argument === "-h") {
      help = true;
      continue;
    }

    if (argument === "--email" || argument === "-e") {
      const nextValue = argv[index + 1]?.trim();

      if (!nextValue) {
        throw new Error("Missing value for --email.");
      }

      email = nextValue;
      index += 1;
      continue;
    }

    if (argument.startsWith("--email=")) {
      const value = argument.slice("--email=".length).trim();

      if (!value) {
        throw new Error("Missing value for --email.");
      }

      email = value;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return {
    email,
    help,
  };
}

function printUsage() {
  console.log("Usage:");
  console.log("  bun run src/grant-lifetime-pro.ts --email you@example.com");
  console.log("");
  console.log("Root workspace command:");
  console.log("  bun run grant:lifetime-pro -- --email you@example.com");
}

async function grantLifetimePro(email: string) {
  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    throw new Error("Email must not be empty.");
  }

  const [existingUser] = await db
    .select({
      id: user.id,
      email: user.email,
      lifetimePro: user.lifetimePro,
    })
    .from(user)
    .where(eq(user.email, normalizedEmail))
    .limit(1);

  if (!existingUser) {
    throw new Error(`No existing user found for \"${normalizedEmail}\".`);
  }

  if (existingUser.lifetimePro) {
    console.log(`Lifetime Pro already granted to ${existingUser.email} (${existingUser.id}).`);
    return;
  }

  await db.update(user).set({ lifetimePro: true }).where(eq(user.id, existingUser.id));

  console.log(`Granted Lifetime Pro to ${existingUser.email} (${existingUser.id}).`);
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  if (!options.email) {
    throw new Error("Missing required --email argument.");
  }

  await grantLifetimePro(options.email);
}

void main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("");
    console.error("Grant failed.");
    console.error(error);
    process.exit(1);
  });
