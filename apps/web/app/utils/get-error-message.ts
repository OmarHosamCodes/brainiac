type ErrorWithMessage = {
  message?: string;
};

type ErrorWithNestedMessage = {
  error?: {
    message?: string;
  };
};

export function getErrorMessage(error: unknown, fallback = "An unexpected error occurred.") {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const knownError = error as ErrorWithMessage & ErrorWithNestedMessage;

    if (knownError.error?.message) {
      return knownError.error.message;
    }

    if (knownError.message) {
      return knownError.message;
    }
  }

  return fallback;
}
