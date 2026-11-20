import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { getSession, restoreSession, signIn, signOut, sessionRequest, subscribe } from "../src/services/authService.js";
import { ROLES } from "../src/constants/roles.js";
import { AuthContext } from "../src/context/authContextInstance.js";
import ProtectedRoute from "../src/components/ProtectedRoute.jsx";

const originalFetch = globalThis.fetch;
const user = { _id: "driver-1", name: "Alex Driver", role: ROLES.USER };
function response(data, status = 200) {
  return { ok: status < 400, status, statusText: status === 401 ? "Unauthorized" : "OK",
    headers: { get: () => "application/json" }, json: async () => data };
}
function renderRoute(context, allowedRoles) {
  return renderToStaticMarkup(
    React.createElement(AuthContext.Provider, { value: context },
      React.createElement(MemoryRouter, { initialEntries: ["/dashboard"] },
        React.createElement(ProtectedRoute, { allowedRoles },
          React.createElement("div", null, "Private content")))));
}

test("Restores the session through refresh and notifies subscribers", async () => {
  let calls = 0;
  let changes = 0;
  const unsubscribe = subscribe(() => { changes += 1; });
  globalThis.fetch = async (url, options) => {
    assert.ok(url.endsWith("/auth/refresh"));
    assert.equal(options.method, "POST");
    assert.equal(options.credentials, "include");
    assert.equal(options.headers["X-Requested-With"], "XMLHttpRequest");
    calls += 1;
    return response({ data: { user, accessToken: "restored-token" } });
  };
  try {
    await Promise.all([restoreSession(), restoreSession()]);
    assert.equal(calls, 1);
    assert.equal(getSession().user._id, user._id);
    assert.equal(getSession().loading, false);
    assert.ok(changes > 0);
  } finally {
    unsubscribe();
    globalThis.fetch = originalFetch;
  }
});

test("Serializes concurrent refresh and retries protected requests", async () => {
  let refreshCalls = 0;
  let staleCalls = 0;
  let newCalls = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith("/auth/login")) return response({ data: { user, accessToken: "old-token" } });
    if (url.endsWith("/auth/refresh")) {
      refreshCalls += 1;
      await new Promise((resolve) => setImmediate(resolve));
      return response({ data: { user, accessToken: "new-token" } });
    }
    if (options.headers.Authorization === "Bearer old-token") {
      staleCalls += 1;
      return response({ message: "Expired" }, 401);
    }
    assert.equal(options.headers.Authorization, "Bearer new-token");
    newCalls += 1;
    return response({ data: { ok: true } });
  };
  try {
    await signIn("login", { email: "driver@example.com", password: "Password123" });
    const results = await Promise.all([
      sessionRequest("/bookings", { method: "GET" }),
      sessionRequest("/auth/me", { method: "GET" }),
    ]);
    assert.equal(staleCalls, 2);
    assert.equal(newCalls, 2);
    assert.equal(refreshCalls, 1);
    assert.ok(results.every((result) => result.data.ok));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Failed refresh clears the protected session", async () => {
  globalThis.fetch = async (url) => {
    if (url.endsWith("/auth/login")) return response({ data: { user, accessToken: "short-lived" } });
    if (url.endsWith("/auth/refresh")) return response({ message: "Session expired" }, 401);
    return response({ message: "Unauthorized" }, 401);
  };
  try {
    await signIn("login", { email: "driver@example.com", password: "Password123" });
    await assert.rejects(sessionRequest("/bookings"), (error) => error.status === 401);
    assert.equal(getSession().user, null);
    assert.equal(getSession().error, "Your session ended. Please sign in again.");
    await assert.rejects(sessionRequest("/bookings"), /Sign in to continue/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Logout clears access to protected requests", async () => {
  let logoutCalls = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith("/auth/login")) return response({ data: { user, accessToken: "secret" } });
    assert.ok(url.endsWith("/auth/logout"));
    assert.equal(options.method, "POST");
    assert.equal(options.headers["X-Requested-With"], "XMLHttpRequest");
    logoutCalls += 1;
    return response({ success: true });
  };
  try {
    await signIn("login", { email: "driver@example.com", password: "Password123" });
    await signOut();
    assert.equal(logoutCalls, 1);
    assert.equal(getSession().user, null);
    await assert.rejects(sessionRequest("/bookings"), /Sign in to continue/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ProtectedRoute hides loading and signed-out content", () => {
  const loading = renderRoute({ user: null, isAuthenticated: false, isLoading: true });
  assert.ok(loading.includes("Verifying authentication session"));
  assert.ok(!loading.includes("Private content"));
  assert.equal(renderRoute({ user: null, isAuthenticated: false, isLoading: false }), "");
});

test("ProtectedRoute enforces allowed roles", () => {
  const context = { user, isAuthenticated: true, isLoading: false };
  assert.ok(renderRoute(context, [ROLES.USER]).includes("Private content"));
  const denied = renderRoute(context, [ROLES.ADMIN, ROLES.MALL_OWNER]);
  assert.ok(denied.includes("Access Restricted"));
  assert.ok(!denied.includes("Private content"));
});
