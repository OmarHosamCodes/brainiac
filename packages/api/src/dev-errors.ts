import { env } from "@brainiac/env/server";
import { ORPCError } from "@orpc/server";

type DevErrorContext = Record<string, unknown>;
type OpenRouterHttpError = Error & {
  statusCode: number;
  body: string;
  contentType: string;
  rawResponse: Response;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return "Unknown error";
}

function getErrorCause(error: unknown) {
  if (!(error instanceof Error)) {
    return undefined;
  }

  const cause = error.cause;

  if (cause instanceof Error) {
    return cause.message;
  }

  if (typeof cause === "string" && cause.trim()) {
    return cause.trim();
  }

  return undefined;
}

function getDebugPayload(
  procedure: string,
  error: unknown,
  context: DevErrorContext,
) {
  return {
    procedure,
    errorName: error instanceof Error ? error.name : typeof error,
    message: getErrorMessage(error),
    cause: getErrorCause(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    ...(isOpenRouterHttpError(error)
      ? {
          upstreamStatus: error.statusCode,
          upstreamContentType: error.contentType,
          upstreamBody: error.body,
        }
      : {}),
  };
}

function isOpenRouterHttpError(error: unknown): error is OpenRouterHttpError {
  return error instanceof Error
    && typeof Reflect.get(error, "statusCode") === "number"
    && typeof Reflect.get(error, "body") === "string"
    && typeof Reflect.get(error, "contentType") === "string"
    && Reflect.get(error, "rawResponse") instanceof Response;
}

function getOpenRouterErrorCode(error: OpenRouterHttpError) {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("guardrail restrictions")
    || message.includes("data policy")
    || message.includes("settings/privacy")
  ) {
    return "FORBIDDEN" as const;
  }

  switch (error.statusCode) {
    case 401:
      return "UNAUTHORIZED" as const;
    case 403:
      return "FORBIDDEN" as const;
    case 404:
      return "NOT_FOUND" as const;
    case 408:
      return "TIMEOUT" as const;
    case 409:
      return "CONFLICT" as const;
    case 413:
      return "PAYLOAD_TOO_LARGE" as const;
    case 422:
      return "UNPROCESSABLE_CONTENT" as const;
    case 429:
      return "TOO_MANY_REQUESTS" as const;
    case 503:
      return "SERVICE_UNAVAILABLE" as const;
    case 504:
      return "GATEWAY_TIMEOUT" as const;
    default:
      return error.statusCode >= 500
        ? "BAD_GATEWAY" as const
        : "BAD_REQUEST" as const;
  }
}

function toOpenRouterProcedureError(
  procedure: string,
  error: OpenRouterHttpError,
  context: DevErrorContext,
) {
  const debug = getDebugPayload(procedure, error, context);
  const code = getOpenRouterErrorCode(error);
  const message = getErrorMessage(error);

  return new ORPCError(code, {
    message,
    data: env.NODE_ENV === "development"
      ? {
          debug: JSON.stringify(debug, null, 2),
        }
      : undefined,
    cause: error,
  });
}

export function toProcedureError(
  procedure: string,
  error: unknown,
  context: DevErrorContext = {},
) {
  if (error instanceof ORPCError) {
    return error;
  }

  console.error(`[${procedure}]`, error);

  if (isOpenRouterHttpError(error)) {
    return toOpenRouterProcedureError(procedure, error, context);
  }

  if (env.NODE_ENV !== "development") {
    return new ORPCError("INTERNAL_SERVER_ERROR");
  }

  const debug = getDebugPayload(procedure, error, context);

  return new ORPCError("INTERNAL_SERVER_ERROR", {
    message: `${procedure} failed: ${debug.message}`,
    data: {
      debug: JSON.stringify(debug, null, 2),
    },
    ...(error instanceof Error ? { cause: error } : {}),
  });
}

export const toInternalServerError = toProcedureError;
