import { intro, isCancel, outro, select, spinner, text, confirm } from "@clack/prompts";
import { uploadTaskAttachmentBuffer } from "@brainiac/api/storage";
import { db } from "@brainiac/db";
import {
  agencyOpsClient,
  agencyOpsClientContact,
  agencyOpsInvoice,
  agencyOpsInvoiceLineItem,
  agencyOpsMemberCapacity,
  agencyOpsMemberRate,
  agencyOpsMemberTenureProfile,
  agencyOpsProject,
  agencyOpsProjectTask,
  agencyOpsProjectTaskAssignee,
  agencyOpsTaskAttachment,
  agencyOpsTaskMessage,
  agencyOpsTaskThread,
  agencyOpsTenurePolicy,
  agencyOpsTimeEntry,
  user,
  workspaceTeam,
  workspaceTeamMember,
  type AttachmentMetadata,
  type AgencyOpsTaskMessageSenderType,
  type AgencyOpsTaskMessageType,
  type WorkspaceTeamRole,
} from "@brainiac/db/schema";
import { createWorkspaceId } from "@brainiac/workspace";
import { and, eq } from "drizzle-orm";
import { ensureCredentialAccount } from "./lib/ensure-credential-account";

type SeedUserKey = "founder" | "ops" | "analyst" | "designer" | "dev";

type SeedUserDefinition = {
  key: SeedUserKey;
  name: string;
  email: string;
};

type SeedActor = {
  id: string;
  name: string;
  email: string;
};

const SEED_USERS: SeedUserDefinition[] = [
  { key: "founder", name: "Avery Founder", email: "founder@brainiac.test" },
  { key: "ops", name: "Mina Operator", email: "ops@brainiac.test" },
  { key: "analyst", name: "Noah Analyst", email: "analyst@brainiac.test" },
  { key: "designer", name: "Luna Designer", email: "designer@brainiac.test" },
  { key: "dev", name: "Felix Dev", email: "dev@brainiac.test" },
];

const DEFAULT_SEED_PASSWORD = "brainiac1234";

const SEED_ATTACHMENT_BYTES = {
  png: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FABJADbad3QAAAABJRU5ErkJggg==",
    "base64",
  ),
  wav: Buffer.from(
    "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
    "base64",
  ),
  pdf: Buffer.from(
    "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF",
  ),
  zip: Buffer.from([0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
} as const;

async function fetchSeedBuffer(url: string, fallback: Buffer): Promise<Buffer> {
  try {
    const response = await fetch(url);
    if (!response.ok) return fallback;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return fallback;
  }
}

async function uploadSeedAttachmentIfPossible(args: {
  storageKey: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}) {
  try {
    await uploadTaskAttachmentBuffer({
      storageKey: args.storageKey,
      buffer: args.buffer,
      mimeType: args.mimeType,
    });
  } catch (error) {
    console.warn(`Seed attachment upload skipped for ${args.fileName}:`, error);
  }
}

type MemberRecord = {
  userId: string;
  userName: string;
  userEmail: string;
  role: "owner" | "editor" | "viewer";
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shiftDate(date: Date, options: { days?: number; hours?: number; minutes?: number } = {}) {
  const { days = 0, hours = 0, minutes = 0 } = options;
  return new Date(date.getTime() + days * 86400000 + hours * 3600000 + minutes * 60000);
}

function getMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ---------------------------------------------------------------------------
// Auth / User helpers
// ---------------------------------------------------------------------------

async function ensureSeedUsers(password: string): Promise<Map<SeedUserKey, SeedActor>> {
  const s = spinner();
  s.start("Ensuring seed users exist");

  const created = new Map<SeedUserKey, SeedActor>();

  for (const def of SEED_USERS) {
    const [existing] = await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(eq(user.email, def.email))
      .limit(1);

    if (existing) {
      await db.update(user).set({ lifetimePro: true }).where(eq(user.id, existing.id));
      await ensureCredentialAccount(existing.id);
      created.set(def.key, existing);
      s.message(`User ${def.email} already exists`);
    } else {
      const userId = createWorkspaceId("user");
      const now = new Date();

      await db.insert(user).values({
        id: userId,
        name: def.name,
        email: def.email,
        emailVerified: true,
        lifetimePro: true,
        createdAt: now,
        updatedAt: now,
      });

      await ensureCredentialAccount(userId, { password });

      created.set(def.key, { id: userId, name: def.name, email: def.email });
      s.message(`Created user ${def.email}`);
    }
  }

  s.stop("Seed users ready");
  return created;
}

// ---------------------------------------------------------------------------
// Interactive prompts
// ---------------------------------------------------------------------------

async function pickTeam(): Promise<{
  teamId: string;
  teamName: string;
  members: MemberRecord[];
} | null> {
  const existingTeams = await db
    .select({ id: workspaceTeam.id, name: workspaceTeam.name })
    .from(workspaceTeam)
    .orderBy(workspaceTeam.name);

  const teamOptions: Array<{ value: string; label: string; hint?: string }> = [
    { value: "__create__", label: "Create a new team", hint: "Start fresh" },
  ];

  for (const t of existingTeams) {
    teamOptions.push({ value: t.id, label: t.name });
  }

  if (existingTeams.length > 0) {
    teamOptions.push({ value: "__skip__", label: "Skip — no team", hint: "Exit without seeding" });
  }

  const choice = await select({
    message: "Select a team to seed agency data into:",
    options: teamOptions,
  });

  if (isCancel(choice)) return null;

  if (choice === "__skip__") return null;

  if (choice === "__create__") {
    return createNewTeam();
  }

  const teamId = choice as string;
  const team = existingTeams.find((t) => t.id === teamId);
  const members = await loadTeamMembers(teamId);
  return { teamId, teamName: team?.name ?? "Unknown", members };
}

async function createNewTeam(): Promise<{
  teamId: string;
  teamName: string;
  members: MemberRecord[];
}> {
  const allUsers = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .orderBy(user.name);

  const ownerChoice = await select({
    message: "Who should be the team owner?",
    options: allUsers.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` })),
  });

  if (isCancel(ownerChoice)) throw new Error("Cancelled");

  const owner = allUsers.find((u) => u.id === ownerChoice);
  const teamName = await text({
    message: "Team name:",
    defaultValue: "My Agency",
    validate: (v) =>
      typeof v === "string" && v.trim().length === 0 ? "Name is required" : undefined,
  });

  if (isCancel(teamName)) throw new Error("Cancelled");

  const s = spinner();
  s.start("Creating team");

  const teamId = createWorkspaceId("team");
  const now = new Date();

  await db.insert(workspaceTeam).values({
    id: teamId,
    name: teamName as string,
    createdByUserId: owner!.id,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(workspaceTeamMember).values({
    id: createWorkspaceId("team-member"),
    teamId,
    userId: owner!.id,
    role: "owner",
    createdAt: now,
    updatedAt: now,
  });

  s.stop(`Team "${teamName}" created`);

  return {
    teamId,
    teamName: teamName as string,
    members: [{ userId: owner!.id, userName: owner!.name, userEmail: owner!.email, role: "owner" }],
  };
}

async function loadTeamMembers(teamId: string): Promise<MemberRecord[]> {
  const rows = await db
    .select({
      userId: workspaceTeamMember.userId,
      role: workspaceTeamMember.role,
      userName: user.name,
      userEmail: user.email,
    })
    .from(workspaceTeamMember)
    .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(eq(workspaceTeamMember.teamId, teamId));

  return rows.map((r) => ({
    userId: r.userId,
    userName: r.userName,
    userEmail: r.userEmail,
    role: r.role as MemberRecord["role"],
  }));
}

async function manageMembers(
  teamId: string,
  currentMembers: MemberRecord[],
): Promise<MemberRecord[]> {
  let members = [...currentMembers];

  const manage = async () => {
    const allUserRows = await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .orderBy(user.name);

    const memberUserIds = new Set(members.map((m) => m.userId));
    const availableUsers = allUserRows.filter((u) => !memberUserIds.has(u.id));

    const action = await select({
      message: `Team members (${members.length}):`,
      options: [
        { value: "add", label: "Add a member" },
        ...(members.length > 1 ? [{ value: "remove", label: "Remove a member" }] : []),
        { value: "done", label: "Done — continue to seeding" },
      ],
    });

    if (isCancel(action)) throw new Error("Cancelled");

    if (action === "add") {
      const chosen = await select({
        message: "Select a user to add:",
        options: [
          ...availableUsers.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` })),
          { value: "__create__", label: "Create a new seed user" },
        ],
      });

      if (isCancel(chosen)) return;

      let userId: string;
      let userName: string;
      let userEmail: string;

      if (chosen === "__create__") {
        const name = await text({ message: "New member name:", defaultValue: "New Member" });
        if (isCancel(name)) return;
        const email = await text({
          message: "New member email:",
          defaultValue: "new@brainiac.test",
          validate: (v) => (typeof v === "string" && v.includes("@") ? undefined : "Invalid email"),
        });
        if (isCancel(email)) return;
        const pw = await text({
          message: "Password:",
          defaultValue: DEFAULT_SEED_PASSWORD,
        });
        if (isCancel(pw)) return;

        const createSpinner = spinner();
        createSpinner.start("Creating new user");
        const now = new Date();
        const newUserId = createWorkspaceId("user");
        await db.insert(user).values({
          id: newUserId,
          name: name as string,
          email: email as string,
          emailVerified: true,
          lifetimePro: true,
          createdAt: now,
          updatedAt: now,
        });
        await ensureCredentialAccount(newUserId, { password: pw as string });
        userId = newUserId;
        userName = name as string;
        userEmail = email as string;
        createSpinner.stop(`Created ${userName}`);
      } else {
        const u = allUserRows.find((r) => r.id === chosen);
        if (!u) return;
        userId = u.id;
        userName = u.name;
        userEmail = u.email;
      }

      const role = await select({
        message: "Role:",
        options: [
          { value: "editor", label: "Editor" },
          { value: "viewer", label: "Viewer" },
          { value: "owner", label: "Owner" },
        ],
      });

      if (isCancel(role)) return;

      const now = new Date();
      await db
        .insert(workspaceTeamMember)
        .values({
          id: createWorkspaceId("team-member"),
          teamId,
          userId,
          role: role as WorkspaceTeamRole,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [workspaceTeamMember.teamId, workspaceTeamMember.userId],
          set: { role: role as WorkspaceTeamRole, updatedAt: now },
        });

      members.push({ userId, userName, userEmail, role: role as WorkspaceTeamRole });
      return;
    }

    if (action === "remove") {
      const removeChoice = await select({
        message: "Select a member to remove:",
        options: members.map((m) => ({
          value: m.userId,
          label: `${m.userName} (${m.userEmail}) — ${m.role}`,
        })),
      });

      if (isCancel(removeChoice)) return;

      await db
        .delete(workspaceTeamMember)
        .where(
          and(
            eq(workspaceTeamMember.teamId, teamId),
            eq(workspaceTeamMember.userId, removeChoice as string),
          ),
        );

      members = members.filter((m) => m.userId !== removeChoice);
      return;
    }
  };

  await manage();
  return members;
}

// ---------------------------------------------------------------------------
// Agency data seeders
// ---------------------------------------------------------------------------

type SeedContext = {
  now: Date;
  teamId: string;
  teamName: string;
  members: MemberRecord[];
  actors: Map<SeedUserKey, SeedActor>;
};

type ClientDef = {
  id: string;
  name: string;
  contact: { name: string; email: string; phone: string };
  archived?: boolean;
};

type ProjectDef = {
  id: string;
  clientId: string;
  name: string;
};

type SeedAttachmentDef = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number | null;
  metadata: AttachmentMetadata;
  buffer?: Buffer;
  linkUrl?: string;
};

type SeedMessageDef = {
  id: string;
  userId: string;
  content: string;
  type: AgencyOpsTaskMessageType;
  senderType: AgencyOpsTaskMessageSenderType;
  createdAt: Date;
  attachments?: SeedAttachmentDef[];
};

type TaskDef = {
  id: string;
  threadId: string;
  projectId: string;
  title: string;
  status: "open" | "in_progress" | "done" | "archived";
  assignedToTeam?: boolean;
  assigneeUserIds: string[];
  dueDate: Date | null;
  messages: SeedMessageDef[];
  showcaseThread?: boolean;
};

function seedTextMessage(args: {
  userId: string;
  content: string;
  createdAt: Date;
  senderType?: AgencyOpsTaskMessageSenderType;
  type?: AgencyOpsTaskMessageType;
  attachments?: SeedAttachmentDef[];
}): SeedMessageDef {
  return {
    id: createWorkspaceId("agency-message"),
    userId: args.userId,
    content: args.content,
    type: args.type ?? "text",
    senderType: args.senderType ?? "user",
    createdAt: args.createdAt,
    attachments: args.attachments,
  };
}

async function buildShowcaseThreadMessages(ctx: SeedContext): Promise<SeedMessageDef[]> {
  const ownerId =
    ctx.members.find((member) => member.role === "owner")?.userId ?? ctx.members[0]?.userId ?? "";
  const designerId = ctx.actors.get("designer")?.id ?? ownerId;
  const devId = ctx.actors.get("dev")?.id ?? ownerId;
  const now = ctx.now;
  const daysAgo = (n: number) => shiftDate(now, { days: -n });
  const hoursAgo = (n: number) => shiftDate(now, { hours: -n });

  const [heroImage, moodImage, detailImage] = await Promise.all([
    fetchSeedBuffer(
      "https://picsum.photos/seed/brainiac-thread-hero/960/640.jpg",
      SEED_ATTACHMENT_BYTES.png,
    ),
    fetchSeedBuffer(
      "https://picsum.photos/seed/brainiac-thread-mood/960/640.jpg",
      SEED_ATTACHMENT_BYTES.png,
    ),
    fetchSeedBuffer(
      "https://picsum.photos/seed/brainiac-thread-detail/640/640.jpg",
      SEED_ATTACHMENT_BYTES.png,
    ),
  ]);
  const walkthroughVideo = await fetchSeedBuffer(
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    SEED_ATTACHMENT_BYTES.png,
  );

  const imageAttachment = (
    id: string,
    fileName: string,
    buffer: Buffer,
    width: number,
    height: number,
  ): SeedAttachmentDef => ({
    id,
    fileName,
    mimeType: "image/jpeg",
    sizeBytes: buffer.byteLength,
    metadata: {
      mediaKind: "image",
      imageWidth: width,
      imageHeight: height,
      fileExtension: "jpg",
    },
    buffer,
  });

  return [
    seedTextMessage({
      userId: ownerId,
      content: "Thread showcase — this task includes every message and attachment format.",
      createdAt: daysAgo(6),
    }),
    seedTextMessage({
      userId: designerId,
      content: "Hero and moodboard references for the homepage refresh.",
      createdAt: daysAgo(5),
      type: "attachment",
      attachments: [
        imageAttachment(
          createWorkspaceId("agency-attachment"),
          "homepage-hero.jpg",
          heroImage,
          960,
          640,
        ),
        imageAttachment(
          createWorkspaceId("agency-attachment"),
          "moodboard.jpg",
          moodImage,
          960,
          640,
        ),
      ],
    }),
    seedTextMessage({
      userId: devId,
      content: "Spec PDF, spreadsheet export, and the Figma source file.",
      createdAt: daysAgo(4),
      type: "attachment",
      attachments: [
        {
          id: createWorkspaceId("agency-attachment"),
          fileName: "creative-brief.pdf",
          mimeType: "application/pdf",
          sizeBytes: SEED_ATTACHMENT_BYTES.pdf.byteLength,
          metadata: { mediaKind: "document", fileExtension: "pdf" },
          buffer: SEED_ATTACHMENT_BYTES.pdf,
        },
        {
          id: createWorkspaceId("agency-attachment"),
          fileName: "asset-tracker.xlsx",
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          sizeBytes: SEED_ATTACHMENT_BYTES.zip.byteLength,
          metadata: { mediaKind: "document", fileExtension: "xlsx" },
          buffer: SEED_ATTACHMENT_BYTES.zip,
        },
        {
          id: createWorkspaceId("agency-attachment"),
          fileName: "figma.com/file/homepage",
          mimeType: "text/uri-list",
          sizeBytes: 0,
          linkUrl: "https://www.figma.com/file/example/homepage-refresh",
          metadata: {
            mediaKind: "link",
            sourceUrl: "https://www.figma.com/file/example/homepage-refresh",
          },
        },
      ],
    }),
    seedTextMessage({
      userId: designerId,
      content: "",
      createdAt: daysAgo(3),
      type: "voice",
      attachments: [
        {
          id: createWorkspaceId("agency-attachment"),
          fileName: "voice-note.wav",
          mimeType: "audio/wav",
          sizeBytes: SEED_ATTACHMENT_BYTES.wav.byteLength,
          durationSeconds: 3,
          metadata: { mediaKind: "audio", durationSeconds: 3, fileExtension: "wav" },
          buffer: SEED_ATTACHMENT_BYTES.wav,
        },
      ],
    }),
    seedTextMessage({
      userId: devId,
      content: "Quick walkthrough of the responsive prototype.",
      createdAt: daysAgo(2),
      type: "attachment",
      attachments: [
        {
          id: createWorkspaceId("agency-attachment"),
          fileName: "prototype-walkthrough.mp4",
          mimeType: "video/mp4",
          sizeBytes: walkthroughVideo.byteLength,
          metadata: {
            mediaKind: "video",
            videoWidth: 960,
            videoHeight: 540,
            durationSeconds: 12,
            fileExtension: "mp4",
          },
          buffer: walkthroughVideo,
        },
      ],
    }),
    seedTextMessage({
      userId: ownerId,
      content: "Bundled exports for handoff.",
      createdAt: daysAgo(2),
      type: "attachment",
      attachments: [
        {
          id: createWorkspaceId("agency-attachment"),
          fileName: "handoff-assets.zip",
          mimeType: "application/zip",
          sizeBytes: SEED_ATTACHMENT_BYTES.zip.byteLength,
          metadata: { mediaKind: "archive", fileExtension: "zip" },
          buffer: SEED_ATTACHMENT_BYTES.zip,
        },
        {
          id: createWorkspaceId("agency-attachment"),
          fileName: "readme.txt",
          mimeType: "text/plain",
          sizeBytes: Buffer.byteLength("Export notes for the homepage refresh."),
          metadata: { mediaKind: "document", fileExtension: "txt" },
          buffer: Buffer.from("Export notes for the homepage refresh."),
        },
        {
          id: createWorkspaceId("agency-attachment"),
          fileName: "component-inventory.json",
          mimeType: "application/json",
          sizeBytes: Buffer.byteLength('{"components":["hero","nav","footer"]}'),
          metadata: { mediaKind: "document", fileExtension: "json" },
          buffer: Buffer.from('{"components":["hero","nav","footer"]}'),
        },
        {
          id: createWorkspaceId("agency-attachment"),
          fileName: "analytics-dashboard",
          mimeType: "text/uri-list",
          sizeBytes: 0,
          linkUrl: "https://example.com/analytics/homepage-refresh",
          metadata: {
            mediaKind: "link",
            sourceUrl: "https://example.com/analytics/homepage-refresh",
          },
        },
      ],
    }),
    seedTextMessage({
      userId: ownerId,
      content: "",
      createdAt: daysAgo(1),
      type: "attachment",
      attachments: [
        imageAttachment(
          createWorkspaceId("agency-attachment"),
          "detail-crop.jpg",
          detailImage,
          640,
          640,
        ),
      ],
    }),
    seedTextMessage({
      userId: ownerId,
      content:
        "Can you summarize the attachment mix and call out which layout each group should use?",
      createdAt: hoursAgo(6),
    }),
    seedTextMessage({
      userId: ownerId,
      content: [
        "Here's how the thread attachments map to layouts:",
        "",
        "```typescript",
        "const variant = selectAttachmentVariant(attachments, \"message\");",
        "// image-only -> grid",
        "// links / 4+ files -> list",
        "// small mixed sets -> inline",
        "```",
        "",
        "**Takeaways**",
        "- Image pairs render in the grid.",
        "- Document-heavy drops use the list layout.",
        "- Voice notes stay inline above the transcript player.",
      ].join("\n"),
      createdAt: hoursAgo(5),
      senderType: "agent",
    }),
  ];
}

function buildSeedData(ctx: SeedContext) {
  const { now, members } = ctx;

  const getOwnerId = () =>
    members.find((m) => m.role === "owner")?.userId ?? members[0]?.userId ?? "";
  const getMemberIds = () => members.map((m) => m.userId);
  const pickMember = (exclude?: string): string => {
    const ids = getMemberIds().filter((id) => id !== exclude);
    return ids[Math.floor(Math.random() * ids.length)] ?? getMemberIds()[0] ?? "";
  };
  const daysAgo = (n: number) => shiftDate(now, { days: -n });
  const daysFromNow = (n: number) => shiftDate(now, { days: n });
  const hoursAgo = (n: number) => shiftDate(now, { hours: -n });

  // Clients
  const clients: ClientDef[] = [
    {
      id: createWorkspaceId("agency-client"),
      name: "Acme Corp",
      contact: { name: "Sarah Johnson", email: "sarah@acme.com", phone: "+1-555-0101" },
    },
    {
      id: createWorkspaceId("agency-client"),
      name: "Globex Inc",
      contact: { name: "Bob Smith", email: "bob@globex.com", phone: "+1-555-0102" },
    },
    {
      id: createWorkspaceId("agency-client"),
      name: "Initech",
      contact: { name: "Bill Lumbergh", email: "bill@initech.com", phone: "" },
      archived: true,
    },
  ];

  // Projects
  const projects: ProjectDef[] = [
    {
      id: createWorkspaceId("agency-project"),
      clientId: clients[0]!.id,
      name: "Q2 Brand Campaign",
    },
    { id: createWorkspaceId("agency-project"), clientId: clients[0]!.id, name: "Website Redesign" },
    { id: createWorkspaceId("agency-project"), clientId: clients[1]!.id, name: "Mobile App v3" },
    {
      id: createWorkspaceId("agency-project"),
      clientId: clients[1]!.id,
      name: "Cloud Infrastructure Audit",
    },
    {
      id: createWorkspaceId("agency-project"),
      clientId: clients[2]!.id,
      name: "Legacy System Migration",
    },
  ];

  // Tasks with threads and messages
  const ownerId = getOwnerId();
  const showcaseTaskId = createWorkspaceId("agency-task");
  const showcaseThreadId = createWorkspaceId("agency-thread");
  const tasks: TaskDef[] = [
    {
      id: showcaseTaskId,
      threadId: showcaseThreadId,
      projectId: projects[1]!.id,
      title: "Thread showcase — all message formats",
      status: "in_progress",
      assigneeUserIds: [pickMember()],
      dueDate: daysFromNow(2),
      messages: [],
      showcaseThread: true,
    },
    {
      id: createWorkspaceId("agency-task"),
      threadId: createWorkspaceId("agency-thread"),
      projectId: projects[0]!.id,
      title: "Finalize creative brief",
      status: "done",
      assigneeUserIds: [pickMember()],
      dueDate: daysAgo(5),
      messages: [
        seedTextMessage({
          userId: ownerId,
          content: "Brief draft is ready for review.",
          createdAt: daysAgo(10),
        }),
        seedTextMessage({
          userId: pickMember(ownerId),
          content: "Looks good, just a few tweaks on the targeting section.",
          createdAt: daysAgo(9),
        }),
        seedTextMessage({
          userId: ownerId,
          content: "Updated per feedback. Ready to ship.",
          createdAt: daysAgo(6),
        }),
      ],
    },
    {
      id: createWorkspaceId("agency-task"),
      threadId: createWorkspaceId("agency-thread"),
      projectId: projects[0]!.id,
      title: "Produce social media assets",
      status: "in_progress",
      assigneeUserIds: [pickMember()],
      dueDate: daysFromNow(3),
      messages: [
        seedTextMessage({
          userId: pickMember(),
          content: "Pulling reference images from the brand guide.",
          createdAt: daysAgo(2),
        }),
      ],
    },
    {
      id: createWorkspaceId("agency-task"),
      threadId: createWorkspaceId("agency-thread"),
      projectId: projects[0]!.id,
      title: "Set up campaign tracking",
      status: "open",
      assigneeUserIds: [],
      dueDate: daysFromNow(7),
      messages: [],
    },
    {
      id: createWorkspaceId("agency-task"),
      threadId: createWorkspaceId("agency-thread"),
      projectId: projects[1]!.id,
      title: "Design new homepage mockups",
      status: "done",
      assigneeUserIds: [pickMember()],
      dueDate: daysAgo(3),
      messages: [
        seedTextMessage({
          userId: pickMember(),
          content: "Three concepts ready for client review.",
          createdAt: daysAgo(7),
        }),
        seedTextMessage({
          userId: ownerId,
          content: "Client chose option B. Let's refine.",
          createdAt: daysAgo(5),
        }),
      ],
    },
    {
      id: createWorkspaceId("agency-task"),
      threadId: createWorkspaceId("agency-thread"),
      projectId: projects[1]!.id,
      title: "Implement responsive breakpoints",
      status: "in_progress",
      assigneeUserIds: [pickMember()],
      dueDate: daysFromNow(5),
      messages: [
        seedTextMessage({
          userId: pickMember(),
          content: "Mobile layouts are done. Tablet is WIP.",
          createdAt: hoursAgo(12),
        }),
      ],
    },
    {
      id: createWorkspaceId("agency-task"),
      threadId: createWorkspaceId("agency-thread"),
      projectId: projects[1]!.id,
      title: "Accessibility audit",
      status: "open",
      assigneeUserIds: [],
      dueDate: daysFromNow(10),
      messages: [],
    },
    {
      id: createWorkspaceId("agency-task"),
      threadId: createWorkspaceId("agency-thread"),
      projectId: projects[2]!.id,
      title: "Implement user onboarding flow",
      status: "in_progress",
      assigneeUserIds: [pickMember()],
      dueDate: daysFromNow(4),
      messages: [
        seedTextMessage({
          userId: pickMember(),
          content: "Onboarding screens are coded. Need backend integration.",
          createdAt: daysAgo(1),
        }),
      ],
    },
    {
      id: createWorkspaceId("agency-task"),
      threadId: createWorkspaceId("agency-thread"),
      projectId: projects[2]!.id,
      title: "Push notification setup",
      status: "open",
      assigneeUserIds: [pickMember()],
      dueDate: daysFromNow(8),
      messages: [],
    },
    {
      id: createWorkspaceId("agency-task"),
      threadId: createWorkspaceId("agency-thread"),
      projectId: projects[2]!.id,
      title: "Beta testing coordination",
      status: "open",
      assigneeUserIds: [],
      dueDate: daysFromNow(14),
      messages: [],
    },
    {
      id: createWorkspaceId("agency-task"),
      threadId: createWorkspaceId("agency-thread"),
      projectId: projects[3]!.id,
      title: "Security compliance review",
      status: "done",
      assigneeUserIds: [pickMember()],
      dueDate: daysAgo(2),
      messages: [
        seedTextMessage({
          userId: pickMember(),
          content: "All critical findings have been addressed.",
          createdAt: daysAgo(4),
        }),
        seedTextMessage({
          userId: ownerId,
          content: "Great work. Closing this out.",
          createdAt: daysAgo(2),
        }),
      ],
    },
    {
      id: createWorkspaceId("agency-task"),
      threadId: createWorkspaceId("agency-thread"),
      projectId: projects[3]!.id,
      title: "Cost optimization report",
      status: "in_progress",
      assigneeUserIds: [pickMember()],
      dueDate: daysFromNow(6),
      messages: [
        seedTextMessage({
          userId: pickMember(),
          content: "Preliminary savings estimate: ~30% on compute.",
          createdAt: hoursAgo(48),
        }),
      ],
    },
    {
      id: createWorkspaceId("agency-task"),
      threadId: createWorkspaceId("agency-thread"),
      projectId: projects[4]!.id,
      title: "Data migration ETL pipeline",
      status: "archived",
      assigneeUserIds: [],
      dueDate: null,
      messages: [
        seedTextMessage({
          userId: ownerId,
          content: "Client paused this indefinitely.",
          createdAt: daysAgo(20),
        }),
      ],
    },
  ];

  // Time entries spanning the past 2 weeks
  const timeEntries: Array<{
    id: string;
    projectId: string;
    taskId: string | null;
    userId: string;
    source: "timer" | "manual";
    description: string;
    startedAt: Date;
    endedAt: Date;
    durationSeconds: number;
  }> = [];

  for (let day = 1; day <= 14; day++) {
    const date = daysAgo(day);
    const hour = 9 + Math.floor(Math.random() * 8);

    for (const member of members) {
      if (Math.random() > 0.4) continue; // ~60% chance of having entries each day

      const numEntries = 1 + Math.floor(Math.random() * 2);
      for (let e = 0; e < numEntries; e++) {
        const project = projects[Math.floor(Math.random() * projects.length)]!;
        const relTasks = tasks.filter((t) => t.projectId === project.id);
        const task =
          relTasks.length > 0 ? relTasks[Math.floor(Math.random() * relTasks.length)]! : null;
        const startH = hour + e * 2 + Math.floor(Math.random() * 2);
        const durationM = 15 + Math.floor(Math.random() * 225);
        const start = new Date(date);
        start.setHours(startH, Math.floor(Math.random() * 60), 0, 0);
        const end = new Date(start.getTime() + durationM * 60000);

        timeEntries.push({
          id: createWorkspaceId("agency-time-entry"),
          projectId: project.id,
          taskId: task?.id ?? null,
          userId: member.userId,
          source: Math.random() > 0.3 ? "timer" : "manual",
          description: task ? `Work on ${task.title}` : `General ${project.name} work`,
          startedAt: start,
          endedAt: end,
          durationSeconds: durationM * 60,
        });
      }
    }
  }

  return { clients, projects, tasks, timeEntries };
}

async function seedTaskMessageAttachments(args: {
  teamId: string;
  taskId: string;
  messageId: string;
  createdAt: Date;
  attachments: SeedAttachmentDef[];
}) {
  for (const attachment of args.attachments) {
    const extension = attachment.fileName.split(".").pop() ?? "bin";
    const storageKey = attachment.linkUrl
      ? `task-links/${args.teamId}/${args.taskId}/${attachment.id}`
      : `task-attachments/${args.teamId}/${args.taskId}/${attachment.id}${extension ? `.${extension}` : ""}`;

    if (attachment.buffer) {
      await uploadSeedAttachmentIfPossible({
        storageKey,
        buffer: attachment.buffer,
        mimeType: attachment.mimeType,
        fileName: attachment.fileName,
      });
    }

    await db.insert(agencyOpsTaskAttachment).values({
      id: attachment.id,
      teamId: args.teamId,
      messageId: args.messageId,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      storageKey,
      sizeBytes: attachment.sizeBytes,
      durationSeconds: attachment.durationSeconds ?? null,
      metadata: attachment.metadata,
      createdAt: args.createdAt,
    });
  }
}

async function seedAgencyData(ctx: SeedContext) {
  const s = spinner();
  s.start("Building seed data");

  const data = buildSeedData(ctx);
  const ownerId =
    ctx.members.find((m) => m.role === "owner")?.userId ?? ctx.members[0]?.userId ?? "";
  const now = ctx.now;
  const teamId = ctx.teamId;

  s.message("Seeding clients...");
  for (const c of data.clients) {
    await db.insert(agencyOpsClient).values({
      id: c.id,
      teamId,
      name: c.name,
      createdByUserId: ownerId,
      createdAt: now,
      updatedAt: now,
      archivedAt: c.archived ? shiftDate(now, { days: -30 }) : null,
    });

    if (c.contact) {
      await db.insert(agencyOpsClientContact).values({
        id: createWorkspaceId("agency-contact"),
        teamId,
        clientId: c.id,
        name: c.contact.name,
        email: c.contact.email,
        phone: c.contact.phone,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  s.message("Seeding projects...");
  for (const p of data.projects) {
    await db.insert(agencyOpsProject).values({
      id: p.id,
      teamId,
      clientId: p.clientId,
      name: p.name,
      createdByUserId: ownerId,
      createdAt: now,
      updatedAt: now,
    });
  }

  s.message("Seeding tasks, threads, and messages...");
  for (const t of data.tasks) {
    const taskMessages = t.showcaseThread
      ? await buildShowcaseThreadMessages(ctx)
      : t.messages;
    const firstMessageAt = taskMessages[0]?.createdAt ?? now;
    const lastMessageAt = taskMessages[taskMessages.length - 1]?.createdAt ?? now;

    await db.insert(agencyOpsProjectTask).values({
      id: t.id,
      teamId,
      projectId: t.projectId,
      title: t.title,
      status: t.status,
      assignedToTeam: t.assignedToTeam ?? false,
      dueDate: t.dueDate,
      createdByUserId: ownerId,
      createdAt: firstMessageAt,
      updatedAt: lastMessageAt,
    });

    if (!t.assignedToTeam && t.assigneeUserIds.length > 0) {
      await db.insert(agencyOpsProjectTaskAssignee).values(
        t.assigneeUserIds.map((userId) => ({
          taskId: t.id,
          userId,
        })),
      );
    }

    await db.insert(agencyOpsTaskThread).values({
      id: t.threadId,
      teamId,
      taskId: t.id,
      createdAt: firstMessageAt,
      updatedAt: lastMessageAt,
    });

    for (const msg of taskMessages) {
      await db.insert(agencyOpsTaskMessage).values({
        id: msg.id,
        teamId,
        threadId: t.threadId,
        userId: msg.userId,
        content: msg.content,
        type: msg.type,
        senderType: msg.senderType,
        createdAt: msg.createdAt,
        updatedAt: msg.createdAt,
      });

      if (msg.attachments && msg.attachments.length > 0) {
        await seedTaskMessageAttachments({
          teamId,
          taskId: t.id,
          messageId: msg.id,
          createdAt: msg.createdAt,
          attachments: msg.attachments,
        });
      }
    }
  }

  s.message("Seeding time entries...");
  for (const te of data.timeEntries) {
    await db.insert(agencyOpsTimeEntry).values({
      id: te.id,
      teamId,
      projectId: te.projectId,
      taskId: te.taskId,
      userId: te.userId,
      source: te.source,
      description: te.description,
      startedAt: te.startedAt,
      endedAt: te.endedAt,
      durationSeconds: te.durationSeconds,
      createdAt: te.startedAt,
      updatedAt: te.startedAt,
    });
  }

  s.message("Seeding member rates...");
  for (const member of ctx.members) {
    const costRate = member.role === "owner" ? 5000 : member.role === "editor" ? 3000 : 1500;
    const billableRate = member.role === "owner" ? 15000 : member.role === "editor" ? 10000 : 5000;
    await db
      .insert(agencyOpsMemberRate)
      .values({
        id: createWorkspaceId("agency-rate"),
        teamId,
        userId: member.userId,
        costRateCents: costRate,
        billableRateCents: billableRate,
        currency: "USD",
        effectiveFrom: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [agencyOpsMemberRate.teamId, agencyOpsMemberRate.userId],
        set: { costRateCents: costRate, billableRateCents: billableRate, updatedAt: now },
      });
  }

  s.message("Seeding member capacity...");
  const weekStart = getMonday(now);
  for (const member of ctx.members) {
    await db
      .insert(agencyOpsMemberCapacity)
      .values({
        id: createWorkspaceId("agency-capacity"),
        teamId,
        userId: member.userId,
        weekStart,
        capacitySeconds: 144000, // 40h
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          agencyOpsMemberCapacity.teamId,
          agencyOpsMemberCapacity.userId,
          agencyOpsMemberCapacity.weekStart,
        ],
        set: { capacitySeconds: 144000, updatedAt: now },
      });
  }

  s.message("Seeding invoices...");
  const activeClients = data.clients.filter((c) => !c.archived);
  const invoicePeriodStart = shiftDate(now, { days: -30 });
  const invoicePeriodEnd = now;

  for (let ci = 0; ci < activeClients.length; ci++) {
    const client = activeClients[ci]!;
    const clientProjects = data.projects.filter((p) => p.clientId === client.id);
    const clientTimeEntries = data.timeEntries.filter((te) =>
      clientProjects.some((cp) => cp.id === te.projectId),
    );
    const totalSeconds = clientTimeEntries.reduce((sum, te) => sum + te.durationSeconds, 0);

    const invoiceStatuses: Array<"draft" | "sent" | "paid"> = ["sent", "paid", "draft"];
    const status = invoiceStatuses[ci] ?? "draft";

    const invoiceId = createWorkspaceId("agency-invoice");
    const invoiceNumber = `INV-${String(ci + 1).padStart(4, "0")}`;

    const avgRate = ctx.members[0] ? 10000 : 10000;
    const amountCents = Math.round((totalSeconds / 3600) * avgRate);

    await db.insert(agencyOpsInvoice).values({
      id: invoiceId,
      teamId,
      clientId: client.id,
      number: invoiceNumber,
      status,
      amountCents,
      currency: "USD",
      periodStart: invoicePeriodStart,
      periodEnd: invoicePeriodEnd,
      issuedAt: status !== "draft" ? invoicePeriodEnd : null,
      paidAt: status === "paid" ? shiftDate(invoicePeriodEnd, { days: 5 }) : null,
      createdByUserId: ownerId,
      createdAt: invoicePeriodEnd,
      updatedAt: invoicePeriodEnd,
    });

    // Line items — group time entries by project
    for (const proj of clientProjects) {
      const projEntries = clientTimeEntries.filter((te) => te.projectId === proj.id);
      if (projEntries.length === 0) continue;
      const projSeconds = projEntries.reduce((sum, te) => sum + te.durationSeconds, 0);
      const projAmount = Math.round((projSeconds / 3600) * avgRate);

      await db.insert(agencyOpsInvoiceLineItem).values({
        id: createWorkspaceId("agency-line-item"),
        invoiceId,
        description: `${proj.name} — time entries`,
        projectId: proj.id,
        durationSeconds: projSeconds,
        rateCents: avgRate,
        amountCents: projAmount,
        fromTimeEntries: true,
        createdAt: invoicePeriodEnd,
      });
    }
  }

  s.message("Seeding tenure policy...");
  await db
    .insert(agencyOpsTenurePolicy)
    .values({
      id: createWorkspaceId("agency-tenure-policy"),
      teamId,
      fiscalYearStartMonth: 1,
      fiscalYearStartDay: 1,
      quarterlyMinHours: 525,
      penaltyMonths: 6,
      internDurationMonths: 4,
      internDurationWeeks: 0,
      policyEffectiveFrom: shiftDate(now, { days: -365 }),
      enabled: true,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [agencyOpsTenurePolicy.teamId],
      set: { enabled: true, updatedAt: now },
    });

  s.message("Seeding member tenure profiles...");
  for (const member of ctx.members) {
    await db
      .insert(agencyOpsMemberTenureProfile)
      .values({
        id: createWorkspaceId("agency-tenure-profile"),
        teamId,
        userId: member.userId,
        internCountsTowardTenure: false,
        internExemptFromQuarterMin: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [agencyOpsMemberTenureProfile.teamId, agencyOpsMemberTenureProfile.userId],
        set: { updatedAt: now },
      });
  }

  s.stop("Agency data seeded successfully");

  return {
    clientsCount: data.clients.length,
    projectsCount: data.projects.length,
    tasksCount: data.tasks.length,
    showcaseTaskTitle: "Thread showcase — all message formats",
    timeEntriesCount: data.timeEntries.length,
    invoicesCount: activeClients.length,
    membersCount: ctx.members.length,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  intro("Brainiac Agency Seed");

  const password = process.env.BRAINIAC_SEED_PASSWORD?.trim() || DEFAULT_SEED_PASSWORD;

  // 1. Ensure seed users exist
  const actors = await ensureSeedUsers(password);

  // 2. Interactive team selection
  const team = await pickTeam();
  if (!team) {
    outro("No team selected. Exiting.");
    process.exit(0);
    return;
  }

  // 3. Interactive member management (loop until done)
  let members = team.members;
  const manageMore = await confirm({
    message: `Manage members for "${team.teamName}"? Currently ${members.length} member(s).`,
    initialValue: true,
  });

  if (!isCancel(manageMore) && manageMore) {
    members = await manageMembers(team.teamId, members);
  }

  // 4. Confirm seeding
  const proceed = await confirm({
    message: `Seed comprehensive agency data into "${team.teamName}" with ${members.length} member(s)?`,
    initialValue: true,
  });

  if (isCancel(proceed) || !proceed) {
    outro("Seed cancelled.");
    process.exit(0);
    return;
  }

  // 5. Seed all agency data
  const ctx: SeedContext = {
    now: new Date(),
    teamId: team.teamId,
    teamName: team.teamName,
    members,
    actors,
  };

  const stats = await seedAgencyData(ctx);

  // 6. Summary
  console.log("");
  console.log("── Seed Summary ──────────────────────────────");
  console.log(`  Team:        ${ctx.teamName} (${ctx.teamId})`);
  console.log(`  Members:     ${stats.membersCount}`);
  for (const m of members) {
    console.log(`    • ${m.userName} (${m.userEmail}) — ${m.role}`);
  }
  console.log(`  Clients:     ${stats.clientsCount}`);
  console.log(`  Projects:    ${stats.projectsCount}`);
  console.log(`  Tasks:       ${stats.tasksCount}`);
  console.log(`  Showcase:    ${stats.showcaseTaskTitle}`);
  console.log(`  Time entries: ${stats.timeEntriesCount}`);
  console.log(`  Invoices:    ${stats.invoicesCount}`);
  console.log("──────────────────────────────────────────────");
  console.log("");
  console.log("Demo credentials (password: " + password + "):");
  for (const def of SEED_USERS) {
    console.log(`  ${def.email} — ${def.name}`);
  }
  console.log("");

  outro("Agency seed complete!");
}

void main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("");
    console.error("Seed agency failed.");
    console.error(error);
    process.exit(1);
  });
