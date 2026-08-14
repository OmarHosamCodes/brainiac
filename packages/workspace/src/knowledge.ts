import { z } from "zod";

import {
  DEFAULT_WORKSPACE_NODE_HEIGHT,
  DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
  DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
  DEFAULT_WORKSPACE_NODE_WIDTH,
} from "./constants";
import {
  workspaceAgencyRefSchema,
  workspaceDecisionBlockSchema,
  workspaceNodeSchema,
  workspaceNodeTabSchema,
  workspaceNodeVisibilitySchema,
  workspaceNotesBlockSchema,
} from "./schemas";
import type { WorkspaceNode } from "./types";

export type WorkspaceKnowledgeAgencyRef = z.infer<typeof workspaceAgencyRefSchema>;

export const knowledgeObjectTypeSchema = z.enum([
  "document",
  "note",
  "decision",
  "person",
  "source",
  "agency.project",
  "agency.task",
  "agency.member",
  "agency.client",
  "agency.timeEntry",
]);

export const canvasNativeObjectTypeSchema = z.enum([
  "document",
  "note",
  "decision",
  "person",
  "source",
]);

export const knowledgeRelationTypeSchema = z.enum([
  "related",
  "about",
  "supports",
  "blocks",
  "mentions",
  "is",
]);

export const knowledgeTargetSchema = z.object({
  objectType: knowledgeObjectTypeSchema,
  id: z.string().min(1),
});

export const knowledgeDecisionPropertiesSchema = z.object({
  status: z.enum(["open", "decided", "deferred"]).default("open"),
  recommendation: z.string().max(4000).default(""),
  decidedAt: z.string().datetime().nullable().default(null),
});

export const knowledgeDocumentContentSchema = z.object({
  body: z.string().max(4000).default(""),
  nodeType: z.enum(["standard", "orchestrator"]).default("standard"),
  label: z.string().max(120).optional(),
  minWidth: z.number().positive().optional(),
  minHeight: z.number().positive().optional(),
  tabs: z.array(workspaceNodeTabSchema).default([]),
  customBlockTemplates: z.array(z.unknown()).default([]),
  viewState: z
    .object({
      activeTabId: z.string().min(1).nullable().optional(),
      notePreviewState: z.record(z.string(), z.boolean()).default({}),
    })
    .default({ activeTabId: null, notePreviewState: {} }),
  dashboard: z
    .object({
      tint: z.string().default("neutral"),
      featuredBlocks: z
        .array(z.object({ tabId: z.string().min(1), blockId: z.string().min(1) }))
        .default([]),
    })
    .default({ tint: "neutral", featuredBlocks: [] }),
});

export const knowledgeObjectSchema = z
  .object({
    id: z.string().min(1),
    objectType: canvasNativeObjectTypeSchema,
    title: z.string().trim().min(1).max(120),
    ownerUserId: z.string().min(1),
    visibility: workspaceNodeVisibilitySchema.default("private"),
    teamId: z.string().min(1).nullable().optional(),
    properties: z.record(z.string(), z.unknown()).default({}),
    content: z.unknown().nullable().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .superRefine((object, ctx) => {
    if (object.visibility === "team" && !object.teamId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["teamId"],
        message: "team-visible objects require teamId",
      });
    }
  });

export const knowledgeRelationSchema = z.object({
  id: z.string().min(1),
  fromObjectId: z.string().min(1),
  fromObjectType: canvasNativeObjectTypeSchema,
  toObjectType: knowledgeObjectTypeSchema,
  toObjectId: z.string().min(1),
  relationType: knowledgeRelationTypeSchema,
  ownerUserId: z.string().min(1),
  teamId: z.string().min(1).nullable().optional(),
  properties: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const knowledgePlacementSchema = z.object({
  id: z.string().min(1),
  objectId: z.string().min(1),
  viewId: z.string().min(1).default("board"),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().positive(),
  height: z.number().positive(),
  ownerUserId: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type KnowledgeObjectType = z.infer<typeof knowledgeObjectTypeSchema>;
export type CanvasNativeObjectType = z.infer<typeof canvasNativeObjectTypeSchema>;
export type AgencyKnowledgeObjectType = Extract<KnowledgeObjectType, `agency.${string}`>;
export type KnowledgeRelationType = z.infer<typeof knowledgeRelationTypeSchema>;
export type KnowledgeTarget = z.infer<typeof knowledgeTargetSchema>;
export type KnowledgeObject = z.infer<typeof knowledgeObjectSchema>;
export type KnowledgeRelation = z.infer<typeof knowledgeRelationSchema>;
export type KnowledgePlacement = z.infer<typeof knowledgePlacementSchema>;
export const knowledgeObjectViewSchema = z.object({
  origin: z.enum(["canvas", "agency"]),
  objectType: knowledgeObjectTypeSchema,
  id: z.string().min(1),
  title: z.string(),
  teamId: z.string().nullable(),
  href: z.string().nullable().optional(),
  missing: z.boolean().optional(),
  properties: z.record(z.string(), z.unknown()).default({}),
  placement: knowledgePlacementSchema.nullable().optional(),
  relationCounts: z
    .object({
      in: z.number().int().nonnegative(),
      out: z.number().int().nonnegative(),
    })
    .optional(),
});

export type KnowledgeObjectView = z.infer<typeof knowledgeObjectViewSchema>;

export function isCanvasNativeObjectType(value: string): value is CanvasNativeObjectType {
  return canvasNativeObjectTypeSchema.safeParse(value).success;
}

export function isAgencyObjectType(value: string): value is AgencyKnowledgeObjectType {
  return knowledgeObjectTypeSchema.safeParse(value).success && value.startsWith("agency.");
}

function knowledgeId(prefix: string, ...parts: string[]) {
  return [prefix, ...parts].join("-");
}

function isoNow(value?: string) {
  return value ?? new Date().toISOString();
}

export function agencyRefFromRelations(
  object: Pick<KnowledgeObject, "id" | "teamId" | "visibility">,
  relations: KnowledgeRelation[],
): WorkspaceKnowledgeAgencyRef | null {
  if (object.visibility !== "team" || !object.teamId) return null;
  const about = relations.filter(
    (relation) =>
      relation.fromObjectId === object.id &&
      relation.relationType === "about" &&
      (relation.toObjectType === "agency.project" || relation.toObjectType === "agency.task"),
  );
  const project = about.find((relation) => relation.toObjectType === "agency.project");
  const task = about.find((relation) => relation.toObjectType === "agency.task");
  if (!project) return null;
  return workspaceAgencyRefSchema.parse({
    teamId: object.teamId,
    projectId: project.toObjectId,
    ...(task ? { taskId: task.toObjectId } : {}),
  });
}

export function relationsFromAgencyRef(input: {
  objectId: string;
  objectType: CanvasNativeObjectType;
  ownerUserId: string;
  teamId: string | null | undefined;
  agencyRef: WorkspaceKnowledgeAgencyRef | null | undefined;
  timestamp?: string;
}): KnowledgeRelation[] {
  const ref = input.agencyRef;
  if (!ref?.projectId) return [];
  const timestamp = isoNow(input.timestamp);
  const relations: KnowledgeRelation[] = [
    knowledgeRelationSchema.parse({
      id: knowledgeId("krel", input.objectId, "agency.project", ref.projectId, "about"),
      fromObjectId: input.objectId,
      fromObjectType: input.objectType,
      toObjectType: "agency.project",
      toObjectId: ref.projectId,
      relationType: "about",
      ownerUserId: input.ownerUserId,
      teamId: input.teamId ?? ref.teamId,
      properties: {},
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
  ];
  if (ref.taskId) {
    relations.push(
      knowledgeRelationSchema.parse({
        id: knowledgeId("krel", input.objectId, "agency.task", ref.taskId, "about"),
        fromObjectId: input.objectId,
        fromObjectType: input.objectType,
        toObjectType: "agency.task",
        toObjectId: ref.taskId,
        relationType: "about",
        ownerUserId: input.ownerUserId,
        teamId: input.teamId ?? ref.teamId,
        properties: {},
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    );
  }
  return relations;
}

export function workspaceNodeToKnowledge(node: WorkspaceNode): {
  object: KnowledgeObject;
  placement: KnowledgePlacement;
  relations: KnowledgeRelation[];
} {
  const parsed = workspaceNodeSchema.parse(node);
  const ownerUserId = parsed.ownerUserId;
  if (!ownerUserId) {
    throw new Error("workspace node requires ownerUserId before knowledge projection");
  }
  const timestamp = parsed.updatedAt;
  const object = knowledgeObjectSchema.parse({
    id: parsed.id,
    objectType: "document",
    title: parsed.title,
    ownerUserId,
    visibility: parsed.visibility,
    teamId: parsed.teamId ?? null,
    properties: {},
    content: knowledgeDocumentContentSchema.parse({
      body: parsed.content,
      nodeType: parsed.nodeType,
      label: parsed.label,
      minWidth: parsed.minWidth,
      minHeight: parsed.minHeight,
      tabs: parsed.tabs,
      customBlockTemplates: parsed.customBlockTemplates,
      viewState: parsed.viewState,
      dashboard: parsed.dashboard,
    }),
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
  });
  const placement = knowledgePlacementSchema.parse({
    id: knowledgeId("kplc", parsed.id, "board", ownerUserId),
    objectId: parsed.id,
    viewId: "board",
    x: parsed.x,
    y: parsed.y,
    width: parsed.width,
    height: parsed.height,
    ownerUserId,
    createdAt: parsed.createdAt,
    updatedAt: timestamp,
  });
  const relations: KnowledgeRelation[] = [];
  if (parsed.nodeType === "orchestrator") {
    for (const connection of parsed.connections) {
      relations.push(
        knowledgeRelationSchema.parse({
          id: knowledgeId("krel", parsed.id, "document", connection.targetNodeId, "related"),
          fromObjectId: parsed.id,
          fromObjectType: "document",
          toObjectType: "document",
          toObjectId: connection.targetNodeId,
          relationType: "related",
          ownerUserId,
          teamId: parsed.teamId ?? null,
          properties: {},
          createdAt: parsed.createdAt,
          updatedAt: timestamp,
        }),
      );
    }
  }
  relations.push(
    ...relationsFromAgencyRef({
      objectId: parsed.id,
      objectType: "document",
      ownerUserId,
      teamId: parsed.teamId,
      agencyRef: parsed.agencyRef,
      timestamp,
    }),
  );
  return { object, placement, relations };
}

function synthesizeTab(input: {
  object: KnowledgeObject;
  blockType: "notes" | "decision";
  body: string;
  recommendation: string;
}) {
  const timestamp = input.object.updatedAt;
  const block =
    input.blockType === "decision"
      ? workspaceDecisionBlockSchema.parse({
          id: knowledgeId("block", input.object.id, "decision"),
          type: "decision",
          title: input.object.title,
          pros: [],
          cons: [],
          recommendation: input.recommendation,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
      : workspaceNotesBlockSchema.parse({
          id: knowledgeId("block", input.object.id, "notes"),
          type: "notes",
          title: input.object.title,
          body: input.body,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
  return workspaceNodeTabSchema.parse({
    id: knowledgeId("tab", input.object.id, "overview"),
    title: "Overview",
    blocks: [block],
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function knowledgeToWorkspaceNode(
  object: KnowledgeObject,
  placement: KnowledgePlacement | null,
  relations: KnowledgeRelation[],
): WorkspaceNode {
  const parsedObject = knowledgeObjectSchema.parse(object);
  const x = placement?.x ?? 0;
  const y = placement?.y ?? 0;
  const width = placement?.width ?? DEFAULT_WORKSPACE_NODE_WIDTH;
  const height = placement?.height ?? DEFAULT_WORKSPACE_NODE_HEIGHT;
  const agencyRef = agencyRefFromRelations(parsedObject, relations);

  if (parsedObject.objectType === "document") {
    const content = knowledgeDocumentContentSchema.parse(parsedObject.content ?? {});
    const connections =
      content.nodeType === "orchestrator"
        ? relations
            .filter(
              (relation) =>
                relation.fromObjectId === parsedObject.id &&
                relation.relationType === "related" &&
                relation.toObjectType === "document",
            )
            .map((relation) => ({ targetNodeId: relation.toObjectId }))
        : [];
    return workspaceNodeSchema.parse({
      id: parsedObject.id,
      title: parsedObject.title,
      content: content.body,
      nodeType: content.nodeType,
      ownerUserId: parsedObject.ownerUserId,
      visibility: parsedObject.visibility,
      teamId: parsedObject.teamId ?? null,
      agencyRef,
      x,
      y,
      width,
      height,
      label: content.label ?? parsedObject.title,
      minWidth: content.minWidth ?? DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
      minHeight: content.minHeight ?? DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
      createdAt: parsedObject.createdAt,
      updatedAt: parsedObject.updatedAt,
      tabs: content.tabs,
      customBlockTemplates: content.customBlockTemplates,
      connections,
      viewState: content.viewState,
      dashboard: content.dashboard,
    });
  }

  const properties = parsedObject.properties;
  const body = typeof properties.body === "string" ? properties.body : "";
  const recommendation =
    typeof properties.recommendation === "string" ? properties.recommendation : "";
  const blockType = parsedObject.objectType === "decision" ? "decision" : "notes";
  const tab = synthesizeTab({
    object: parsedObject,
    blockType,
    body,
    recommendation,
  });
  return workspaceNodeSchema.parse({
    id: parsedObject.id,
    title: parsedObject.title,
    content: body,
    nodeType: "standard",
    ownerUserId: parsedObject.ownerUserId,
    visibility: parsedObject.visibility,
    teamId: parsedObject.teamId ?? null,
    agencyRef,
    x,
    y,
    width,
    height,
    label: parsedObject.title,
    minWidth: DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
    minHeight: DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
    createdAt: parsedObject.createdAt,
    updatedAt: parsedObject.updatedAt,
    tabs: [tab],
    customBlockTemplates: [],
    connections: [],
    viewState: { activeTabId: tab.id, notePreviewState: {} },
    dashboard: { tint: "neutral", featuredBlocks: [] },
  });
}
