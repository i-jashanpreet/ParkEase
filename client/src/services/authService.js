import apiClient from "./api.js";
import { ApiError } from "./apiError.js";

/**
 * Authentication Service
 *
 * BACKEND STATUS: PENDING IMPLEMENTATION
 * Live backend endpoints are currently pending implementation by the server team (Sprint 2):
 * - POST /api/auth/register (User registration)
 * - POST /api/auth/login (User authentication & session issuance)
 * - GET /api/auth/me (Current user session profile)
 * - POST /api/auth/logout (User logout session invalidation)
 *
 * Safe absence handling:
 * Unconfirmed endpoints (/auth/me, /auth/logout) are NOT called unless backend auth
 * is confirmed available, preventing speculative 404 network errors.
 */

export const AUTH_SERVICE_STATUS = "PENDING_BACKEND_IMPLEMENTATION";

export const PENDING_AUTH_ROUTES = Object.freeze({
  REGISTER: "/auth/register",
  LOGIN: "/auth/login",
  ME: "/auth/me",
  LOGOUT: "/auth/logout",
});

/**
 * Indicates whether backend authentication routes are confirmed and live on the server.
 * Currently false because only GET /api/health is implemented on the backend.
 */
let backendAuthConfirmed = false;

export function isBackendAuthAvailable() {
  return backendAuthConfirmed;
}

export function setBackendAuthAvailable(available) {
  backendAuthConfirmed = Boolean(available);
}

/**
 * Normalizes authentication payloads across different API envelope conventions:
 * e.g., { data: { user, token } } or { user, token } or direct user payloads.
 */
export function normalizeAuthResponse(response) {
  if (!response || typeof response !== "object") {
    return { user: null, token: null, message: null, raw: response };
  }

  const payload =
    response.data && typeof response.data === "object" && !Array.isArray(response.data)
      ? response.data
      : response;

  const user =
    payload.user && typeof payload.user === "object"
      ? payload.user
      : payload.id && payload.email
        ? payload
        : null;

  const token = payload.token || response.token || null;

  return {
    user,
    token,
    message: response.message || payload.message || null,
    raw: response,
  };
}

/**
 * Authenticates user credentials against the backend login endpoint.
 * Throws an ApiError if the backend endpoint is unavailable or returns an error.
 */
export async function login(credentials, options = {}) {
  const response = await apiClient.post(PENDING_AUTH_ROUTES.LOGIN, credentials, options);
  const normalized = normalizeAuthResponse(response);

  // Guard against treating empty or malformed responses as authenticated
  if (!normalized.user) {
    throw new ApiError({
      message: "Authentication failed. The server did not return user credentials.",
      status: 502,
      statusText: "Bad Gateway",
      data: response,
    });
  }

  return normalized;
}

/**
 * Registers a new user account against the backend registration endpoint.
 * Throws an ApiError if the backend endpoint is unavailable or returns an error.
 */
export async function register(userData, options = {}) {
  const response = await apiClient.post(PENDING_AUTH_ROUTES.REGISTER, userData, options);
  return normalizeAuthResponse(response);
}

/**
 * Retrieves the currently authenticated user's profile.
 * Does not fire network requests to unconfirmed endpoints if backend auth is not ready.
 */
export async function getCurrentUser(options = {}) {
  if (!backendAuthConfirmed) {
    // Backend endpoint is not yet implemented/confirmed; safely return null
    return null;
  }

  try {
    const response = await apiClient.get(PENDING_AUTH_ROUTES.ME, options);
    if (!response || typeof response !== "object") {
      return null;
    }
    const payload =
      response.data && typeof response.data === "object" && !Array.isArray(response.data)
        ? response.data
        : response;

    return payload.user || payload;
  } catch (err) {
    if (err.status === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * Requests server-side session invalidation or token revocation.
 * Safely handles the absence of backend logout endpoint without failing client-side cleanup.
 */
export async function logout(options = {}) {
  if (!backendAuthConfirmed) {
    // Backend endpoint is not yet implemented/confirmed; safely resolve client-side logout
    return { success: true, pendingBackend: true };
  }

  try {
    return await apiClient.post(PENDING_AUTH_ROUTES.LOGOUT, {}, options);
  } catch {
    // If backend route returns an error, still permit client-side cleanup
    return { success: true, pendingBackend: true };
  }
}

const authService = {
  status: AUTH_SERVICE_STATUS,
  pendingRoutes: PENDING_AUTH_ROUTES,
  isBackendAuthAvailable,
  setBackendAuthAvailable,
  login,
  register,
  getCurrentUser,
  logout,
  normalizeAuthResponse,
};

export default authService;
