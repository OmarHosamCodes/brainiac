type ErrorWithMessage = {
  message?: string;
};

type ErrorWithNestedMessage = {
  error?: {
    message?: string;
    data?: {
      message?: string;
    };
  };
};

type ErrorWithDataMessage = {
  data?: {
    message?: string;
  };
};

export function getErrorMessage(error: unknown, fallback = "An unexpected error occurred.") {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const knownError = error as ErrorWithMessage & ErrorWithNestedMessage & ErrorWithDataMessage;

    if (knownError.error?.data?.message) {
      return knownError.error.data.message;
    }

    if (knownError.data?.message) {
      return knownError.data.message;
    }

    if (knownError.error?.message) {
      return knownError.error.message;
    }

    if (knownError.message) {
      return knownError.message;
    }
  }

  return fallback;
}
