import { env } from "@brainiac/env/server";
import { ORPCError } from "@orpc/server";

type DevErrorContext = Record<string, unknown>;

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

export function toInternalServerError(
  procedure: string,
  error: unknown,
  context: DevErrorContext = {},
) {
  if (error instanceof ORPCError) {
    return error;
  }

  console.error(`[${procedure}]`, error);

  if (env.NODE_ENV !== "development") {
    return new ORPCError("INTERNAL_SERVER_ERROR");
  }

  const debug = {
    procedure,
    errorName: error instanceof Error ? error.name : typeof error,
    message: getErrorMessage(error),
    cause: getErrorCause(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
  };

  return new ORPCError("INTERNAL_SERVER_ERROR", {
    message: `${procedure} failed: ${debug.message}`,
    data: {
      debug: JSON.stringify(debug, null, 2),
    },
    ...(error instanceof Error ? { cause: error } : {}),
  });
}
