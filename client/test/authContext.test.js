import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import {
  apiClient,
  tokenStorage,
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  setUnauthorizedHandler,
} from "../src/services/api.js";
import authService, {
  login,
  register,
  getCurrentUser,
  logout,
  normalizeAuthResponse,
  isBackendAuthAvailable,
  setBackendAuthAvailable,
  PENDING_AUTH_ROUTES,
  AUTH_SERVICE_STATUS,
} from "../src/services/authService.js";
import { ROLES } from "../src/constants/roles.js";
import { AuthContext } from "../src/context/authContextInstance.js";
import ProtectedRoute from "../src/components/ProtectedRoute.jsx";
import Navbar from "../src/components/Navbar.jsx";
import DashboardLayout from "../src/layouts/DashboardLayout.jsx";

const originalFetch = globalThis.fetch;

test("Token & Cookie flexibility: in-memory default, optional persistence, credentials: include", async () => {
  // Ensure token starts cleared and persistence is off by default
  tokenStorage.enablePersistence(false);
  clearAuthToken();
  assert.equal(getAuthToken(), null);

  // In-memory token management
  setAuthToken("sample-jwt-token-12345");
  assert.equal(getAuthToken(), "sample-jwt-token-12345");

  // Verify request sends credentials: "include" and Authorization Bearer header
  let capturedOptions = null;
  globalThis.fetch = async (url, options) => {
    capturedOptions = options;
    return {
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ success: true }),
    };
  };

  try {
    await apiClient.get("/test-endpoint");
    assert.ok(capturedOptions, "Request options should be captured");
    assert.equal(
      capturedOptions.credentials,
      "include",
      "Should include credentials for cookie-based session support"
    );
    assert.equal(
      capturedOptions.headers.Authorization,
      "Bearer sample-jwt-token-12345",
      "Should include Authorization header with Bearer token"
    );

    // Clear token (e.g. cookie-only mode where client stores no token)
    clearAuthToken();
    assert.equal(getAuthToken(), null);

    await apiClient.get("/test-endpoint-cookie-only");
    assert.equal(
      capturedOptions.headers.Authorization,
      undefined,
      "Should not include Authorization header when token is null"
    );
    assert.equal(
      capturedOptions.credentials,
      "include",
      "Cookie credentials should still be included in cookie-only mode"
    );
  } finally {
    globalThis.fetch = originalFetch;
    clearAuthToken();
  }
});

test("401 Unauthorized handling invokes registered callback", async () => {
  let unauthorizedFired = false;
  setUnauthorizedHandler(() => {
    unauthorizedFired = true;
  });

  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    statusText: "Unauthorized",
    headers: { get: () => "application/json" },
    json: async () => ({ message: "Token expired or invalid" }),
  });

  try {
    await assert.rejects(
      async () => {
        await apiClient.get("/auth/protected-endpoint");
      },
      (err) => {
        assert.equal(err.status, 401);
        assert.equal(err.message, "Token expired or invalid");
        return true;
      }
    );

    assert.equal(unauthorizedFired, true, "Unauthorized handler should have been triggered on 401");
  } finally {
    globalThis.fetch = originalFetch;
    setUnauthorizedHandler(null);
  }
});

test("Pending backend auth safe absence: does not call unconfirmed /me or /logout endpoints", async () => {
  setBackendAuthAvailable(false);
  assert.equal(isBackendAuthAvailable(), false);

  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return {
      ok: false,
      status: 404,
      headers: { get: () => "application/json" },
      json: async () => ({ message: "Not found" }),
    };
  };

  try {
    // 1. getCurrentUser safely returns null without calling fetch
    const user = await getCurrentUser();
    assert.equal(user, null);
    assert.equal(fetchCalled, false, "Should not call unconfirmed /api/auth/me");

    // 2. logout safely resolves client-side without calling fetch
    const logoutRes = await logout();
    assert.equal(logoutRes.success, true);
    assert.equal(logoutRes.pendingBackend, true);
    assert.equal(fetchCalled, false, "Should not call unconfirmed /api/auth/logout");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Failed login and register requests when backend returns 404", async () => {
  globalThis.fetch = async () => ({
    ok: false,
    status: 404,
    statusText: "Not Found",
    headers: { get: () => "application/json" },
    json: async () => ({ message: "API route not found" }),
  });

  try {
    // Login against unavailable backend
    await assert.rejects(
      async () => {
        await login({ email: "driver@example.com", password: "Password123" });
      },
      (err) => {
        assert.equal(err.status, 404);
        assert.equal(err.message, "API route not found");
        return true;
      }
    );

    // Register against unavailable backend
    await assert.rejects(
      async () => {
        await register({ name: "Driver", email: "driver@example.com", password: "Password123" });
      },
      (err) => {
        assert.equal(err.status, 404);
        assert.equal(err.message, "API route not found");
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("authService: normalization helper handles various API envelopes", () => {
  // Case 1: Standard wrapped response { data: { user: {...}, token: "..." } }
  const res1 = normalizeAuthResponse({
    success: true,
    data: {
      user: { id: "u1", name: "Jashan", email: "jashan@example.com", role: ROLES.USER },
      token: "tok-abc",
    },
  });
  assert.equal(res1.user.name, "Jashan");
  assert.equal(res1.token, "tok-abc");

  // Case 2: Flat response { user: {...}, token: "..." }
  const res2 = normalizeAuthResponse({
    user: { id: "u2", name: "Admin User", email: "admin@example.com", role: ROLES.ADMIN },
    token: "tok-xyz",
    message: "Login successful",
  });
  assert.equal(res2.user.role, ROLES.ADMIN);
  assert.equal(res2.token, "tok-xyz");
  assert.equal(res2.message, "Login successful");

  // Case 3: Empty / malformed response
  const res3 = normalizeAuthResponse(null);
  assert.equal(res3.user, null);
  assert.equal(res3.token, null);
});

test("authService: confirmed endpoints interaction when backend is available", async () => {
  setBackendAuthAvailable(true);
  assert.equal(authService.status, AUTH_SERVICE_STATUS);
  assert.equal(PENDING_AUTH_ROUTES.LOGIN, "/auth/login");
  assert.equal(PENDING_AUTH_ROUTES.REGISTER, "/auth/register");
  assert.equal(PENDING_AUTH_ROUTES.ME, "/auth/me");
  assert.equal(PENDING_AUTH_ROUTES.LOGOUT, "/auth/logout");

  let calledUrl = "";
  let calledMethod = "";
  let calledBody = null;

  globalThis.fetch = async (url, options) => {
    calledUrl = url;
    calledMethod = options.method;
    calledBody = options.body ? JSON.parse(options.body) : null;

    if (url.includes("/auth/login")) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({
          success: true,
          data: {
            user: { id: "u10", name: "Alex Driver", email: "alex@example.com", role: ROLES.USER },
            token: "jwt-login-token",
          },
        }),
      };
    }

    if (url.includes("/auth/register")) {
      return {
        ok: true,
        status: 201,
        headers: { get: () => "application/json" },
        json: async () => ({
          success: true,
          message: "Account registered successfully",
          data: {
            user: { id: "u11", name: "Sam Visitor", email: "sam@example.com", role: ROLES.USER },
            token: "jwt-reg-token",
          },
        }),
      };
    }

    if (url.includes("/auth/me")) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({
          data: {
            user: { id: "u10", name: "Alex Driver", email: "alex@example.com", role: ROLES.USER },
          },
        }),
      };
    }

    if (url.includes("/auth/logout")) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({ success: true }),
      };
    }

    return {
      ok: false,
      status: 404,
      statusText: "Not Found",
      headers: { get: () => "application/json" },
      json: async () => ({ message: "Not found" }),
    };
  };

  try {
    // 1. Login
    const loginResult = await login({ email: "alex@example.com", password: "Password123" });
    assert.ok(calledUrl.endsWith("/auth/login"));
    assert.equal(calledMethod, "POST");
    assert.equal(calledBody.email, "alex@example.com");
    assert.equal(loginResult.user.name, "Alex Driver");
    assert.equal(loginResult.token, "jwt-login-token");

    // 2. Register
    const regResult = await register({
      name: "Sam Visitor",
      email: "sam@example.com",
      password: "Password123",
    });
    assert.ok(calledUrl.endsWith("/auth/register"));
    assert.equal(calledMethod, "POST");
    assert.equal(calledBody.name, "Sam Visitor");
    assert.equal(regResult.user.name, "Sam Visitor");
    assert.equal(regResult.token, "jwt-reg-token");

    // 3. Current User
    const meResult = await getCurrentUser();
    assert.ok(calledUrl.endsWith("/auth/me"));
    assert.equal(calledMethod, "GET");
    assert.equal(meResult.name, "Alex Driver");

    // 4. Logout
    const logoutResult = await logout();
    assert.ok(calledUrl.endsWith("/auth/logout"));
    assert.equal(calledMethod, "POST");
    assert.equal(logoutResult.success, true);
  } finally {
    globalThis.fetch = originalFetch;
    setBackendAuthAvailable(false);
  }
});

test("ProtectedRoute: redirects unauthenticated users and prevents access to dashboard", () => {
  const unauthenticatedContext = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    hasRole: () => false,
    hasAnyRole: () => false,
  };

  const html = renderToStaticMarkup(
    React.createElement(
      AuthContext.Provider,
      { value: unauthenticatedContext },
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/dashboard"] },
        React.createElement(
          ProtectedRoute,
          null,
          React.createElement("div", null, "Secret Dashboard Content")
        )
      )
    )
  );

  // During static rendering, <Navigate /> returns null (preventing protected output)
  assert.equal(html, "", "Unauthenticated user must be redirected and see null content");
  assert.ok(!html.includes("Secret Dashboard Content"), "Protected content should not render for guests");
});

test("ProtectedRoute: displays loading indicator while session is being verified", () => {
  const loadingContext = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    hasRole: () => false,
    hasAnyRole: () => false,
  };

  const html = renderToStaticMarkup(
    React.createElement(
      AuthContext.Provider,
      { value: loadingContext },
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/dashboard"] },
        React.createElement(
          ProtectedRoute,
          null,
          React.createElement("div", null, "Secret Dashboard Content")
        )
      )
    )
  );

  assert.ok(html.includes("Verifying authentication session..."), "Should render session loading indicator");
  assert.ok(!html.includes("Secret Dashboard Content"), "Should not render protected content during loading");
});

test("ProtectedRoute: renders protected content when authenticated without role constraints", () => {
  const authenticatedContext = {
    user: { id: "u1", name: "Jashan", role: ROLES.USER },
    isAuthenticated: true,
    isLoading: false,
    hasRole: (r) => r === ROLES.USER,
    hasAnyRole: (roles) => roles.includes(ROLES.USER),
  };

  const html = renderToStaticMarkup(
    React.createElement(
      AuthContext.Provider,
      { value: authenticatedContext },
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/dashboard"] },
        React.createElement(
          ProtectedRoute,
          null,
          React.createElement("div", null, "Authorized Dashboard Content")
        )
      )
    )
  );

  assert.ok(html.includes("Authorized Dashboard Content"), "Protected content should render for authenticated user");
});

test("ProtectedRoute: renders 403 Forbidden access restricted view when user role is not permitted", () => {
  const driverContext = {
    user: { id: "u1", name: "Standard Driver", role: ROLES.USER },
    isAuthenticated: true,
    isLoading: false,
    hasRole: (r) => r === ROLES.USER,
    hasAnyRole: (roles) => roles.includes(ROLES.USER),
  };

  const html = renderToStaticMarkup(
    React.createElement(
      AuthContext.Provider,
      { value: driverContext },
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/admin-panel"] },
        React.createElement(
          ProtectedRoute,
          { allowedRoles: [ROLES.ADMIN, ROLES.MALL_OWNER] },
          React.createElement("div", null, "Super Secret Admin Control")
        )
      )
    )
  );

  assert.ok(!html.includes("Super Secret Admin Control"), "Unauthorized role should not see admin control");
  assert.ok(html.includes("Access Restricted"), "Should render Access Restricted heading");
  assert.ok(html.includes("403 Forbidden"), "Should show 403 Forbidden badge");
  assert.ok(html.includes("USER"), "Should state user role in explanation");
  assert.ok(html.includes("Return to Dashboard"), "Should provide link to return to dashboard");
});

test("ProtectedRoute: grants access when user role matches allowedRoles whitelist", () => {
  const adminContext = {
    user: { id: "u9", name: "Admin Officer", role: ROLES.ADMIN },
    isAuthenticated: true,
    isLoading: false,
    hasRole: (r) => r === ROLES.ADMIN,
    hasAnyRole: (roles) => roles.includes(ROLES.ADMIN),
  };

  const html = renderToStaticMarkup(
    React.createElement(
      AuthContext.Provider,
      { value: adminContext },
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/admin-panel"] },
        React.createElement(
          ProtectedRoute,
          { allowedRoles: [ROLES.ADMIN] },
          React.createElement("div", null, "Super Secret Admin Control")
        )
      )
    )
  );

  assert.ok(html.includes("Super Secret Admin Control"), "Admin role should see permitted content");
});

test("Navbar component renders authentication state and sign-out controls", () => {
  // Case 1: Unauthenticated
  const guestContext = {
    user: null,
    isAuthenticated: false,
    logout: () => {},
  };

  const guestHtml = renderToStaticMarkup(
    React.createElement(
      AuthContext.Provider,
      { value: guestContext },
      React.createElement(MemoryRouter, null, React.createElement(Navbar))
    )
  );

  assert.ok(guestHtml.includes("Login"));
  assert.ok(guestHtml.includes("Register"));
  assert.ok(!guestHtml.includes("Sign Out"));

  // Case 2: Authenticated
  const authContext = {
    user: { id: "u1", name: "Jashanpreet Singh", role: ROLES.ADMIN },
    isAuthenticated: true,
    logout: () => {},
  };

  const authHtml = renderToStaticMarkup(
    React.createElement(
      AuthContext.Provider,
      { value: authContext },
      React.createElement(MemoryRouter, null, React.createElement(Navbar))
    )
  );

  assert.ok(authHtml.includes("Jashanpreet Singh"), "Should display user name");
  assert.ok(authHtml.includes("ADMIN"), "Should display role badge");
  assert.ok(authHtml.includes("Sign Out"), "Should show Sign Out button");
  assert.ok(!authHtml.includes("href=\"/login\""), "Should not show Login link when logged in");
});

test("DashboardLayout component renders authenticated user information and initials", () => {
  const authContext = {
    user: { id: "u2", name: "Priya Sharma", role: ROLES.MALL_OWNER },
    isAuthenticated: true,
    logout: () => {},
  };

  const html = renderToStaticMarkup(
    React.createElement(
      AuthContext.Provider,
      { value: authContext },
      React.createElement(MemoryRouter, null, React.createElement(DashboardLayout))
    )
  );

  assert.ok(html.includes("PS"), "Should compute initials 'PS' from Priya Sharma");
  assert.ok(html.includes("MALL_OWNER"), "Should render user role in header");
  assert.ok(html.includes("Sign Out"), "Should render Sign Out action");
  assert.ok(html.includes("Session Active"), "Should render Session Active status");
});
