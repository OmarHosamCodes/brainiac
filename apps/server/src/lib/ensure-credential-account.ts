import { hashPassword } from "better-auth/crypto";
import { db } from "@orch/db";
import { account } from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";
import { eq } from "drizzle-orm";

export type EnsureCredentialAccountResult = "exists" | "migrated" | "created" | "updated";

export type EnsureCredentialAccountOptions = {
  password?: string;
  updatePassword?: boolean;
};

async function hashAuthPassword(password: string): Promise<string> {
  return hashPassword(password);
}

/**
 * Better Auth 1.5+ expects email/password accounts to use providerId "credential"
 * and accountId equal to the user id. Legacy scripts used providerId "email"
 * with accountId set to the email address, which breaks sign-in.
 */
export async function ensureCredentialAccount(
  userId: string,
  options?: EnsureCredentialAccountOptions,
): Promise<EnsureCredentialAccountResult> {
  const accounts = await db.select().from(account).where(eq(account.userId, userId));
  const credentialAccount = accounts.find((row) => row.providerId === "credential");
  const legacyEmailAccount = accounts.find((row) => row.providerId === "email" && row.password);

  if (options?.updatePassword && options.password) {
    const passwordHash = await hashAuthPassword(options.password);
    const now = new Date();

    if (credentialAccount) {
      await db
        .update(account)
        .set({ password: passwordHash, accountId: userId, updatedAt: now })
        .where(eq(account.id, credentialAccount.id));
    } else {
      await db.insert(account).values({
        id: createWorkspaceId("account"),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const legacy of accounts.filter((row) => row.providerId === "email")) {
      await db.delete(account).where(eq(account.id, legacy.id));
    }

    return credentialAccount ? "updated" : "created";
  }

  if (credentialAccount?.password) {
    if (legacyEmailAccount) {
      await db.delete(account).where(eq(account.id, legacyEmailAccount.id));
      return "migrated";
    }
    return "exists";
  }

  const now = new Date();
  let passwordHash = credentialAccount?.password ?? legacyEmailAccount?.password ?? null;

  if (!passwordHash) {
    if (!options?.password) {
      throw new Error("Password required to create credential account");
    }
    passwordHash = await hashAuthPassword(options.password);
  }

  if (credentialAccount) {
    await db
      .update(account)
      .set({ password: passwordHash, accountId: userId, updatedAt: now })
      .where(eq(account.id, credentialAccount.id));
  } else {
    await db.insert(account).values({
      id: createWorkspaceId("account"),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const legacy of accounts.filter((row) => row.providerId === "email")) {
    await db.delete(account).where(eq(account.id, legacy.id));
  }

  if (legacyEmailAccount) return "migrated";
  if (credentialAccount) return "updated";
  return "created";
}

export async function hasCredentialAccount(userId: string): Promise<boolean> {
  const accounts = await db.select().from(account).where(eq(account.userId, userId));
  return accounts.some((row) => row.providerId === "credential" && row.password);
}

export async function hasLegacyEmailAccount(userId: string): Promise<boolean> {
  const accounts = await db.select().from(account).where(eq(account.userId, userId));
  return accounts.some((row) => row.providerId === "email" && row.password);
}
