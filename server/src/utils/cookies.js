import AppError from "./AppError.js";

export const REFRESH_COOKIE_NAME = "parkease_refresh_token";
export const DEFAULT_REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const DURATION_UNITS_MS = Object.freeze({
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
});

/**
 * Single source of truth for the refresh token lifetime in milliseconds.
 * Used by both `getRefreshCookieOptions().maxAge` and Phase 1B database
 * `RefreshToken.expiresAt` calculation (`getRefreshTokenExpiryDate()`),
 * ensuring cookie expiry and database document expiry never drift.
 */
export function getRefreshTokenTtlMs() {
  const raw = process.env.JWT_REFRESH_EXPIRES_IN?.trim();
  if (!raw) {
    return DEFAULT_REFRESH_TOKEN_TTL_MS;
  }
  const match = /^(\d+)(ms|s|m|h|d)?$/i.exec(raw);
  if (!match) {
    throw new AppError(
      500,
      "Invalid JWT_REFRESH_EXPIRES_IN configuration",
      "CONFIG_ERROR",
    );
  }
  const value = Number(match[1]);
  const unit = (match[2] || "ms").toLowerCase();
  const ttlMs = value * DURATION_UNITS_MS[unit];
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) {
    throw new AppError(
      500,
      "Invalid JWT_REFRESH_EXPIRES_IN configuration",
      "CONFIG_ERROR",
    );
  }
  return ttlMs;
}

export function getRefreshTokenExpiryDate(nowMs = Date.now()) {
  return new Date(nowMs + getRefreshTokenTtlMs());
}

/**
 * Returns the HttpOnly refresh cookie options for the current environment.
 *
 * Deployment note:
 * - In local development (http://localhost:5173 -> http://localhost:5000),
 *   secure is false and sameSite is "lax".
 * - In production when frontend and backend share the same site/domain,
 *   secure is true and sameSite is "strict".
 * - If production frontend and backend are deployed cross-site on separate
 *   domains, sameSite must be adjusted to "none" (with secure: true) alongside
 *   strict Origin and custom header CSRF validation.
 */
export function getRefreshCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/api/auth",
    maxAge: getRefreshTokenTtlMs(),
  };
}

export function setRefreshCookie(res, rawToken) {
  if (!res || typeof res.cookie !== "function") {
    throw new AppError(500, "Invalid HTTP response object", "INTERNAL_ERROR");
  }
  if (typeof rawToken !== "string" || rawToken.trim().length === 0) {
    throw new AppError(
      400,
      "Refresh token must be a non-empty string",
      "INVALID_TOKEN_INPUT",
    );
  }
  res.cookie(REFRESH_COOKIE_NAME, rawToken, getRefreshCookieOptions());
}

export function clearRefreshCookie(res) {
  if (!res || typeof res.clearCookie !== "function") {
    throw new AppError(500, "Invalid HTTP response object", "INTERNAL_ERROR");
  }
  const { httpOnly, secure, sameSite, path } = getRefreshCookieOptions();
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly,
    secure,
    sameSite,
    path,
  });
}

export function parseCookies(req) {
  const header = req?.headers?.cookie;
  if (typeof header !== "string" || header.trim().length === 0) {
    return {};
  }

  const cookies = {};
  const pairs = header.split(";");
  for (const pair of pairs) {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = pair.slice(0, separatorIndex).trim();
    const rawValue = pair.slice(separatorIndex + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(rawValue);
    } catch {
      cookies[key] = rawValue;
    }
  }
  return cookies;
}
