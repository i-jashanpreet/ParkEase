import { apiRequest } from "./api.js";

let accessToken = null;
let snapshot = { user: null, loading: true, error: "" };
let refreshFlight;
let restoreFlight;
let signingOut = false;
const listeners = new Set();
const cookieHeaders = { "X-Requested-With": "XMLHttpRequest" };

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSession() {
  return snapshot;
}

function publish(data, error = "") {
  accessToken = data?.accessToken ?? null;
  snapshot = { user: data?.user ?? null, loading: false, error };
  for (const listener of listeners) listener();
}

function withCookieLock(action) {
  return globalThis.navigator?.locks
    ? navigator.locks.request("parkease-auth-cookie", action)
    : action();
}

function refresh() {
  if (!refreshFlight) {
    refreshFlight = withCookieLock(async () => {
      const { data } = await apiRequest("/auth/refresh", {
        method: "POST",
        headers: cookieHeaders,
      });
      publish(data);
      return data.accessToken;
    }).finally(() => { refreshFlight = undefined; });
  }
  return refreshFlight;
}

export function restoreSession() {
  if (!restoreFlight) {
    restoreFlight = refresh().catch((error) => {
      publish(null, error.status === 401 ? "" : error.message);
    });
  }
  return restoreFlight;
}

export async function signIn(action, fields) {
  const { data } = await withCookieLock(() => apiRequest(`/auth/${action}`, {
    method: "POST",
    body: JSON.stringify(fields),
  }));
  publish(data);
}

export async function signOut() {
  signingOut = true;
  try {
    await refreshFlight?.catch(() => {});
    await withCookieLock(() => apiRequest("/auth/logout", {
      method: "POST",
      headers: cookieHeaders,
    }));
    publish(null);
  } finally {
    signingOut = false;
  }
}

export async function sessionRequest(path, options = {}) {
  const request = (token) => apiRequest(path, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  });
  const sentToken = accessToken;
  const userId = snapshot.user?._id;
  if (!sentToken || signingOut) throw new Error("Sign in to continue.");
  try {
    return await request(sentToken);
  } catch (error) {
    if (error.code === "ACCOUNT_BLOCKED" && accessToken === sentToken) publish(null, error.message);
    if (error.status !== 401 || signingOut || !accessToken || snapshot.user?._id !== userId || options.signal?.aborted) throw error;
  }

  let token;
  try {
    token = accessToken === sentToken ? await refresh() : accessToken;
  } catch (error) {
    if ([401, 403].includes(error.status)) publish(null, "Your session ended. Please sign in again.");
    throw error;
  }
  if (signingOut || accessToken !== token || snapshot.user?._id !== userId) throw new Error("Sign in to continue.");
  return request(token);
}

export async function syncProfile() {
  const { data } = await sessionRequest("/auth/me");
  if (snapshot.user?._id === data.user._id && !signingOut) publish({ ...data, accessToken });
}
