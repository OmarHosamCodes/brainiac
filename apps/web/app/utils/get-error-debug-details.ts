type ErrorWithDebugData = {
  data?: {
    debug?: string;
  };
  error?: {
    data?: {
      debug?: string;
    };
  };
};

export function getErrorDebugDetails(error: unknown) {
  if (!import.meta.dev) {
    return null;
  }

  if (typeof error === "object" && error !== null) {
    const knownError = error as ErrorWithDebugData;

    if (typeof knownError.error?.data?.debug === "string") {
      return knownError.error.data.debug;
    }

    if (typeof knownError.data?.debug === "string") {
      return knownError.data.debug;
    }
  }

  if (error instanceof Error && error.stack) {
    return error.stack;
  }

  return null;
}
