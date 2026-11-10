import { ApiError, STATUS_MESSAGES } from "./apiError.js";

const TOKEN_STORAGE_KEY = "parkease_auth_token";
let inMemoryToken = null;
let storagePersistenceEnabled = false;
let unauthorizedHandler = null;

/**
 * Flexible token storage adapter.
 * Supports:
 * 1. In-memory token state (default, avoids assuming localStorage is the final approach).
 * 2. Optional browser storage persistence (localStorage/sessionStorage).
 * 3. HTTP-only cookie-based sessions (where client does not store tokens and uses credentials: "include").
 */
export const tokenStorage = {
  get() {
    if (inMemoryToken) {
      return inMemoryToken;
    }

    if (storagePersistenceEnabled && typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
        if (stored) {
          inMemoryToken = stored;
          return stored;
        }
      } catch {
        // Storage access may fail in private browsing or restricted contexts
      }
    }

    return null;
  },

  set(token) {
    inMemoryToken = token ? String(token).trim() : null;

    if (storagePersistenceEnabled && typeof window !== "undefined" && window.localStorage) {
      try {
        if (inMemoryToken) {
          window.localStorage.setItem(TOKEN_STORAGE_KEY, inMemoryToken);
        } else {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      } catch {
        // Ignore storage access errors
      }
    }
  },

  clear() {
    this.set(null);
  },

  enablePersistence(enabled = true) {
    storagePersistenceEnabled = Boolean(enabled);
  },

  isPersistenceEnabled() {
    return storagePersistenceEnabled;
  },
};

/**
 * Retrieve the current active auth token (if using Bearer token authentication).
 */
export function getAuthToken() {
  return tokenStorage.get();
}

/**
 * Sets the active authentication token in memory (and persistent storage if enabled).
 * Pass null or empty string to clear the token.
 */
export function setAuthToken(token) {
  tokenStorage.set(token);
}

/**
 * Clears the active authentication token.
 */
export function clearAuthToken() {
  tokenStorage.clear();
}

/**
 * Registers a callback invoked whenever any request receives an HTTP 401 Unauthorized status.
 */
export function setUnauthorizedHandler(callback) {
  unauthorizedHandler = typeof callback === "function" ? callback : null;
}

/**
 * Resolves the backend API base URL from Vite environment variables,
 * falling back to local port 5000 in development.
 */
export function getApiBaseUrl() {
  const envUrl =
    typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env.VITE_API_URL
      : typeof globalThis !== "undefined" && globalThis.process && globalThis.process.env
        ? globalThis.process.env.VITE_API_URL
        : undefined;

  return (envUrl || "http://localhost:5000/api").replace(/\/$/, "");
}

/**
 * Constructs a fully qualified API endpoint URL including serialized query parameters.
 */
export function buildUrl(path, params) {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const fullPath = `${baseUrl}${cleanPath}`;

  if (!params || typeof params !== "object" || Object.keys(params).length === 0) {
    return fullPath;
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  if (!queryString) return fullPath;

  const separator = fullPath.includes("?") ? "&" : "?";
  return `${fullPath}${separator}${queryString}`;
}

/**
 * Core HTTP request handler.
 * Supports automated JSON serialization/deserialization, query parameter appending,
 * consistent error normalization, and network error handling.
 */
export async function request(path, options = {}) {
  const { params, headers: customHeaders, body, ...restOptions } = options;
  const url = buildUrl(path, params);

  const headers = {
    Accept: "application/json",
    ...customHeaders,
  };

  const activeToken = getAuthToken();
  if (activeToken && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${activeToken}`;
  }

  let serializedBody = body;
  if (
    body !== undefined &&
    body !== null &&
    typeof body === "object" &&
    !(body instanceof FormData) &&
    !(body instanceof Blob)
  ) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    serializedBody = JSON.stringify(body);
  }

  const fetchOptions = {
    credentials: options.credentials || "include",
    ...restOptions,
    headers,
    body: serializedBody,
  };

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (error) {
    if (error && typeof error === "object" && error.name === "AbortError") {
      throw new ApiError({
        message: "The request timed out or was cancelled.",
        status: 0,
        statusText: "Aborted",
        data: null,
        isNetworkError: false,
      });
    }

    throw new ApiError({
      message:
        error instanceof Error && error.message && error.message !== "Failed to fetch"
          ? error.message
          : "Unable to connect to the server. Please check your network connection.",
      status: 0,
      statusText: "Network Error",
      data: null,
      isNetworkError: true,
    });
  }

  let responseData = null;
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  } else {
    try {
      responseData = await response.text();
    } catch {
      responseData = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      if (typeof unauthorizedHandler === "function") {
        try {
          unauthorizedHandler();
        } catch {
          // Prevent handler failure from suppressing the ApiError
        }
      }
    }

    const serverMessage =
      responseData && typeof responseData === "object" && typeof responseData.message === "string"
        ? responseData.message
        : null;

    const fallbackMessage =
      serverMessage ||
      STATUS_MESSAGES[response.status] ||
      response.statusText ||
      `Request failed with status ${response.status}`;

    throw new ApiError({
      message: fallbackMessage,
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      isNetworkError: false,
    });
  }

  return responseData;
}

/**
 * Shorthand API client object for standard HTTP methods.
 */
export const apiClient = {
  request,
  get(path, options = {}) {
    return request(path, { ...options, method: "GET" });
  },
  post(path, body, options = {}) {
    return request(path, { ...options, method: "POST", body });
  },
  put(path, body, options = {}) {
    return request(path, { ...options, method: "PUT", body });
  },
  patch(path, body, options = {}) {
    return request(path, { ...options, method: "PATCH", body });
  },
  delete(path, options = {}) {
    return request(path, { ...options, method: "DELETE" });
  },
  tokenStorage,
  setToken: setAuthToken,
  getToken: getAuthToken,
  clearToken: clearAuthToken,
  onUnauthorized: setUnauthorizedHandler,
};

/**
 * Backward-compatible helper preserving existing call signatures.
 */
export async function apiRequest(path, options = {}) {
  return request(path, options);
}

export default apiClient;
