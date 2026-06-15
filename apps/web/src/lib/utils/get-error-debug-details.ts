type ErrorWithDebugData = {
  name?: string;
  message?: string;
  code?: string;
  status?: number;
  defined?: boolean;
  data?: {
    debug?: string;
  };
  error?: {
    name?: string;
    message?: string;
    code?: string;
    status?: number;
    defined?: boolean;
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

    return JSON.stringify(
      {
        name: knownError.error?.name ?? knownError.name,
        message: knownError.error?.message ?? knownError.message,
        code: knownError.error?.code ?? knownError.code,
        status: knownError.error?.status ?? knownError.status,
        defined: knownError.error?.defined ?? knownError.defined,
        data: knownError.error?.data ?? knownError.data,
      },
      null,
      2,
    );
  }

  if (error instanceof Error && error.stack) {
    return error.stack;
  }

  return null;
}
