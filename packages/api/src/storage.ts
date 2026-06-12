import { env } from "@brainiac/env/server";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHmac, timingSafeEqual } from "node:crypto";

const TASK_ATTACHMENT_UPLOAD_TOKEN_TTL_MS = 10 * 60 * 1000;

const s3Client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

export function getTaskAttachmentPublicUrl(storageKey: string) {
  const endpoint = env.S3_ENDPOINT.replace(/\/$/, "");
  return `${endpoint}/${env.S3_BUCKET}/${storageKey}`;
}

export async function createTaskAttachmentPresignedUploadUrl(args: {
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: args.storageKey,
    ContentType: args.mimeType,
    ContentLength: args.sizeBytes,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

  return {
    uploadUrl,
    publicUrl: getTaskAttachmentPublicUrl(args.storageKey),
  };
}

export function createTaskAttachmentUploadToken(args: {
  teamId: string;
  taskId: string;
  fileName: string;
  mimeType: string;
  storageKey: string;
  sizeBytes: number;
}) {
  const payload = {
    ...args,
    expiresAt: Date.now() + TASK_ATTACHMENT_UPLOAD_TOKEN_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", env.BETTER_AUTH_SECRET).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyTaskAttachmentUploadToken(
  token: string,
  expected: {
    teamId: string;
    taskId: string;
    fileName: string;
    mimeType: string;
    storageKey: string;
    sizeBytes: number;
  },
) {
  const [body, signature] = token.split(".");
  if (!body || !signature) return false;

  const expectedSignature = createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(body)
    .digest("base64url");
  const provided = Buffer.from(signature);
  const signed = Buffer.from(expectedSignature);
  if (provided.length !== signed.length || !timingSafeEqual(provided, signed)) return false;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return false;
  }

  return (
    payload.teamId === expected.teamId &&
    payload.taskId === expected.taskId &&
    payload.fileName === expected.fileName &&
    payload.mimeType === expected.mimeType &&
    payload.storageKey === expected.storageKey &&
    payload.sizeBytes === expected.sizeBytes &&
    typeof payload.expiresAt === "number" &&
    payload.expiresAt > Date.now()
  );
}

export async function uploadTaskAttachmentBuffer(args: {
  storageKey: string;
  buffer: Buffer;
  mimeType: string;
}) {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: args.storageKey,
      Body: args.buffer,
      ContentType: args.mimeType,
      ContentLength: args.buffer.byteLength,
    }),
  );

  return {
    publicUrl: getTaskAttachmentPublicUrl(args.storageKey),
  };
}

export async function deleteTaskAttachmentFromStorage(storageKey: string) {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: storageKey,
    }),
  );
}
