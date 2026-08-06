/**
 * Fill missing member HR / rates / tenure and client contacts on School Of Marketing
 * so People + Clients UI can be tested against real imported data.
 *
 *   bun run --cwd apps/server src/operations/local-seed-school-marketing-profiles.ts
 *   TEAM_NAME="School Of Marketing" bun run --cwd apps/server src/operations/local-seed-school-marketing-profiles.ts
 */
import { db } from "@orch/db";
import {
  agencyOpsClient,
  agencyOpsClientContact,
  agencyOpsDepartment,
  agencyOpsMemberHrProfile,
  agencyOpsMemberLeave,
  agencyOpsMemberRate,
  agencyOpsMemberTenureProfile,
  user,
  workspaceTeam,
  workspaceTeamMember,
  type AgencyOpsMemberEmploymentType,
  type AgencyOpsMemberLeaveType,
  type AgencyOpsMemberWorkModel,
} from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";
import { and, eq, ilike, isNull } from "drizzle-orm";

const TEAM_NAME = Bun.env.TEAM_NAME ?? "School Of Marketing";

const CAIRO_AREAS = [
  "Maadi, Cairo",
  "Nasr City, Cairo",
  "Heliopolis, Cairo",
  "Zamalek, Cairo",
  "New Cairo",
  "Dokki, Giza",
  "Mohandessin, Giza",
  "6th of October",
] as const;

const FIRST_NAMES = [
  "Sara",
  "Ahmed",
  "Nour",
  "Omar",
  "Layla",
  "Karim",
  "Maya",
  "Youssef",
  "Hana",
  "Tarek",
  "Dina",
  "Mostafa",
] as const;

const LAST_NAMES = [
  "Hassan",
  "Ibrahim",
  "Farouk",
  "Mansour",
  "Saleh",
  "Nabil",
  "Kamal",
  "Rashed",
  "Adel",
  "Fathy",
] as const;

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

function pick<T>(items: readonly T[], seed: number): T {
  // Unsigned modulo — signed shifts on hash seeds can go negative in JS.
  return items[(seed >>> 0) % items.length]!;
}

function egyptianMobile(seed: number): string {
  const prefixes = ["010", "011", "012", "015"] as const;
  const prefix = pick(prefixes, seed);
  const rest = String(1_000_0000 + (seed % 90_000_000)).slice(0, 8);
  return `${prefix}${rest}`;
}

function birthDate(seed: number): string {
  const year = 1988 + (seed % 14);
  const month = String(1 + (seed % 12)).padStart(2, "0");
  const day = String(1 + (seed % 28)).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function slugEmailLocal(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 40);
}

function clientDomain(clientName: string): string {
  const base = clientName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18);
  return `${base || "client"}.eg`;
}

function contactForClient(clientName: string): { name: string; email: string; phone: string } {
  const seed = hashString(clientName);
  const name = `${pick(FIRST_NAMES, seed)} ${pick(LAST_NAMES, seed >>> 3)}`;
  const email = `${slugEmailLocal(name)}@${clientDomain(clientName)}`;
  return { name, email, phone: egyptianMobile(seed) };
}

function employmentForIndex(i: number): AgencyOpsMemberEmploymentType {
  const types: AgencyOpsMemberEmploymentType[] = [
    "full_time",
    "full_time",
    "full_time",
    "part_time",
    "contractor",
    "intern",
  ];
  return types[i % types.length]!;
}

function workModelForIndex(i: number): AgencyOpsMemberWorkModel {
  const models: AgencyOpsMemberWorkModel[] = ["onsite", "hybrid", "remote", "onsite", "hybrid"];
  return models[i % models.length]!;
}

function genderForName(name: string): string {
  const first = name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  // Known roster cues; ambiguous names still get a value so HR UI isn't empty.
  if (["huda", "dina", "hadil", "alaa"].includes(first)) return "female";
  return "male";
}

const teams = await db.select().from(workspaceTeam).where(ilike(workspaceTeam.name, TEAM_NAME));
if (teams.length === 0) {
  console.error(`No team matching "${TEAM_NAME}"`);
  process.exit(1);
}
const team = teams[0]!;
const teamId = team.id;
const now = new Date();

const members = await db
  .select({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: workspaceTeamMember.role,
  })
  .from(workspaceTeamMember)
  .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
  .where(eq(workspaceTeamMember.teamId, teamId));

const departments = await db
  .select()
  .from(agencyOpsDepartment)
  .where(eq(agencyOpsDepartment.teamId, teamId));

if (departments.length === 0) {
  console.error("No departments on team — create Engineering/Content/Art Production first.");
  process.exit(1);
}

const existingHr = await db
  .select()
  .from(agencyOpsMemberHrProfile)
  .where(eq(agencyOpsMemberHrProfile.teamId, teamId));
const hrByUser = new Map(existingHr.map((row) => [row.userId, row]));

const existingRates = await db
  .select()
  .from(agencyOpsMemberRate)
  .where(eq(agencyOpsMemberRate.teamId, teamId));
const rateByUser = new Map(existingRates.map((row) => [row.userId, row]));

const existingTenure = await db
  .select()
  .from(agencyOpsMemberTenureProfile)
  .where(eq(agencyOpsMemberTenureProfile.teamId, teamId));
const tenureByUser = new Map(existingTenure.map((row) => [row.userId, row]));

const existingLeave = await db
  .select()
  .from(agencyOpsMemberLeave)
  .where(eq(agencyOpsMemberLeave.teamId, teamId));

let hrCreated = 0;
let hrPatched = 0;
let ratesCreated = 0;
let tenureCreated = 0;
let leaveCreated = 0;

console.log(`Seeding profiles on "${team.name}" (${members.length} members)…`);

for (let i = 0; i < members.length; i++) {
  const member = members[i]!;
  const seed = hashString(member.userId);
  const department = departments[i % departments.length]!;
  const employmentType = employmentForIndex(i);
  const workModel = workModelForIndex(i);
  const gender = genderForName(member.name);
  const phone = egyptianMobile(seed);
  const address = pick(CAIRO_AREAS, seed);
  const dateOfBirth = birthDate(seed);
  const linkedinUrl = `https://www.linkedin.com/in/${slugEmailLocal(member.name)}-${String(seed).slice(0, 4)}`;

  const hr = hrByUser.get(member.userId);
  if (!hr) {
    await db.insert(agencyOpsMemberHrProfile).values({
      id: createWorkspaceId("agency-hr"),
      teamId,
      userId: member.userId,
      departmentId: department.id,
      status: "active",
      employmentType,
      workModel,
      gender,
      dateOfBirth,
      phone,
      address,
      linkedinUrl,
      offAllowanceDays: 15,
      leaveAllowancePeriod: "year",
      createdAt: now,
      updatedAt: now,
    });
    hrCreated++;
    console.log(`  HR +  ${member.name} → ${department.name}`);
  } else {
    const patch: Partial<typeof agencyOpsMemberHrProfile.$inferInsert> = { updatedAt: now };
    if (!hr.departmentId) patch.departmentId = department.id;
    if (!hr.employmentType) patch.employmentType = employmentType;
    if (!hr.workModel) patch.workModel = workModel;
    if (!hr.gender) patch.gender = gender;
    if (!hr.dateOfBirth) patch.dateOfBirth = dateOfBirth;
    if (!hr.phone) patch.phone = phone;
    if (!hr.address) patch.address = address;
    if (!hr.linkedinUrl) patch.linkedinUrl = linkedinUrl;
    const keys = Object.keys(patch).filter((k) => k !== "updatedAt");
    if (keys.length > 0) {
      await db
        .update(agencyOpsMemberHrProfile)
        .set(patch)
        .where(eq(agencyOpsMemberHrProfile.id, hr.id));
      hrPatched++;
      console.log(`  HR ~  ${member.name} filled [${keys.join(", ")}]`);
    } else {
      console.log(`  HR =  ${member.name} already complete`);
    }
  }

  if (!rateByUser.has(member.userId)) {
    const costRateAmount = 800 + (seed % 12) * 100;
    const billableRateAmount = costRateAmount + 400 + (seed % 8) * 50;
    await db.insert(agencyOpsMemberRate).values({
      id: createWorkspaceId("agency-rate"),
      teamId,
      userId: member.userId,
      costRateAmount,
      billableRateAmount,
      currency: "USD",
      effectiveFrom: now,
      createdAt: now,
      updatedAt: now,
    });
    ratesCreated++;
  }

  if (!tenureByUser.has(member.userId)) {
    await db.insert(agencyOpsMemberTenureProfile).values({
      id: createWorkspaceId("agency-tenure-profile"),
      teamId,
      userId: member.userId,
      internCountsTowardTenure: false,
      internExemptFromQuarterMin: true,
      notes: employmentType === "intern" ? "Seeded intern tenure window" : null,
      internStart: employmentType === "intern" ? new Date("2026-04-01T00:00:00.000Z") : null,
      internEnd: employmentType === "intern" ? new Date("2026-08-01T00:00:00.000Z") : null,
      createdAt: now,
      updatedAt: now,
    });
    tenureCreated++;
  }
}

// A handful of off days so member-profile calendars aren't empty.
if (existingLeave.length === 0 && members.length > 0) {
  const actorUserId =
    members.find((m) => m.email === "omarhosamcodes@gmail.com")?.userId ?? members[0]!.userId;
  const leaveSeeds: Array<{
    userId: string | null;
    startDate: string;
    endDate: string;
    type: AgencyOpsMemberLeaveType;
    reason: string;
  }> = [
    {
      userId: null,
      startDate: "2026-06-30",
      endDate: "2026-07-01",
      type: "team_holiday",
      reason: "Eid holiday (team)",
    },
    {
      userId: members[0]!.userId,
      startDate: "2026-07-20",
      endDate: "2026-07-22",
      type: "pto",
      reason: "Summer break",
    },
    {
      userId: members[Math.min(1, members.length - 1)]!.userId,
      startDate: "2026-08-03",
      endDate: "2026-08-03",
      type: "sick",
      reason: "Flu",
    },
    {
      userId: members[Math.min(2, members.length - 1)]!.userId,
      startDate: "2026-05-12",
      endDate: "2026-05-14",
      type: "pto",
      reason: "Family travel",
    },
  ];

  for (const row of leaveSeeds) {
    await db.insert(agencyOpsMemberLeave).values({
      id: createWorkspaceId("agency-leave"),
      teamId,
      userId: row.userId,
      startDate: row.startDate,
      endDate: row.endDate,
      type: row.type,
      reason: row.reason,
      createdByUserId: actorUserId,
      createdAt: now,
      updatedAt: now,
    });
    leaveCreated++;
  }
}

const clients = await db
  .select()
  .from(agencyOpsClient)
  .where(and(eq(agencyOpsClient.teamId, teamId), isNull(agencyOpsClient.archivedAt)));

const contacts = await db
  .select()
  .from(agencyOpsClientContact)
  .where(eq(agencyOpsClientContact.teamId, teamId));
const contactByClient = new Map(contacts.map((c) => [c.clientId, c]));

let contactsCreated = 0;
let contactsPatched = 0;
let ratesFilled = 0;

console.log(`\nSeeding client contacts (${clients.length} clients)…`);

for (let i = 0; i < clients.length; i++) {
  const client = clients[i]!;
  const seed = hashString(client.id);
  const contact = contactForClient(client.name);
  const existing = contactByClient.get(client.id);

  if (!existing) {
    await db.insert(agencyOpsClientContact).values({
      id: createWorkspaceId("agency-contact"),
      teamId,
      clientId: client.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      createdAt: now,
      updatedAt: now,
    });
    contactsCreated++;
    console.log(`  Contact +  ${client.name} → ${contact.name}`);
  } else {
    const broken =
      !existing.name.trim() ||
      existing.name.includes("undefined") ||
      !existing.email.trim() ||
      existing.email.includes("undefined") ||
      !existing.phone.trim();
    if (broken) {
      await db
        .update(agencyOpsClientContact)
        .set({
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          updatedAt: now,
        })
        .where(eq(agencyOpsClientContact.id, existing.id));
      contactsPatched++;
      console.log(`  Contact ~  ${client.name} → ${contact.name}`);
    }
  }

  if (client.billableRateAmount == null) {
    // Internal / charity-ish clients stay unbillable; others get a realistic rate.
    const internalish =
      /charity|coaching|consultation|school of marketing|not school|mesh madrasa/i.test(
        client.name,
      );
    if (!internalish) {
      const rate = 2500 + (seed % 20) * 250; // $25–$72.50/hr
      await db
        .update(agencyOpsClient)
        .set({ billableRateAmount: rate, updatedAt: now })
        .where(eq(agencyOpsClient.id, client.id));
      ratesFilled++;
    }
  }
}

console.log(`
Done on "${team.name}":
  HR created/patched: ${hrCreated}/${hrPatched}
  Member rates created: ${ratesCreated}
  Tenure profiles created: ${tenureCreated}
  Off days created: ${leaveCreated}
  Client contacts created/patched: ${contactsCreated}/${contactsPatched}
  Client rates filled: ${ratesFilled}
`);

process.exit(0);
