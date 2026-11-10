/**
 * Custom error class representing API and HTTP communication failures.
 */
export class ApiError extends Error {
  constructor({
    message,
    status = 0,
    statusText = "",
    data = null,
    isNetworkError = false,
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.data = data;
    this.isNetworkError = isNetworkError;
    this.isClientError = status >= 400 && status < 500;
    this.isServerError = status >= 500 && status < 600;
    this.isNotFound = status === 404;
    this.isUnauthorized = status === 401;
    this.isForbidden = status === 403;
  }
}

/**
 * Standard human-friendly error messages mapped to HTTP status codes.
 */
export const STATUS_MESSAGES = {
  400: "Invalid request. Please verify the submitted data.",
  401: "Authentication required. Please sign in to continue.",
  403: "Access forbidden. You do not have permission for this resource.",
  404: "The requested resource was not found.",
  409: "Conflict. The requested resource or slot is already in use.",
  413: "Request payload too large.",
  422: "Validation error. Please check your inputs.",
  500: "Internal server error. Please try again later.",
  502: "Bad gateway. The backend server is currently unavailable.",
  503: "Service temporarily unavailable. Please try again shortly.",
};

/**
 * Normalizes any caught error into a standardized user-facing error message string.
 *
 * @param {unknown} error - Caught error of any type (ApiError, Error, string, etc.)
 * @returns {string} Standardized error message suitable for UI display
 */
export function normalizeError(error) {
  if (!error) return "An unexpected error occurred.";

  if (error instanceof ApiError) {
    if (error.isNetworkError) {
      return (
        error.message ||
        "Unable to connect to the server. Please check your network connection."
      );
    }

    if (error.data && typeof error.data === "object" && typeof error.data.message === "string") {
      return error.data.message;
    }

    return (
      STATUS_MESSAGES[error.status] ||
      error.message ||
      `Request failed with status ${error.status}`
    );
  }

  if (error && typeof error === "object" && error.name === "AbortError") {
    return "The request timed out or was cancelled.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred.";
}
