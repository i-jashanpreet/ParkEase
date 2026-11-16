import test from "node:test";
import assert from "node:assert/strict";

import {
  apiClient,
  apiRequest,
  getApiBaseUrl,
  buildUrl,
} from "../src/services/api.js";
import {
  ApiError,
  normalizeError,
  STATUS_MESSAGES,
} from "../src/services/apiError.js";
import { getHealthStatus } from "../src/services/healthService.js";
import { AUTH_SERVICE_STATUS, PENDING_AUTH_ROUTES } from "../src/services/authService.js";
import { MALL_SERVICE_STATUS, PENDING_MALL_ROUTES } from "../src/services/mallService.js";
import { PARKING_SERVICE_STATUS, PENDING_PARKING_ROUTES } from "../src/services/parkingService.js";
import { BOOKING_SERVICE_STATUS, PENDING_BOOKING_ROUTES } from "../src/services/bookingService.js";

// Save original global.fetch
const originalFetch = globalThis.fetch;

test("API base URL resolution and URL builder", () => {
  const baseUrl = getApiBaseUrl();
  assert.ok(baseUrl.startsWith("http"));
  assert.ok(!baseUrl.endsWith("/"), "Base URL should not end with a trailing slash");

  // Basic path joining
  const path1 = buildUrl("/health");
  assert.equal(path1, `${baseUrl}/health`);

  const path2 = buildUrl("health");
  assert.equal(path2, `${baseUrl}/health`);

  // Query parameter serialization
  const pathWithParams = buildUrl("/slots", { floor: "B1", available: true, empty: null });
  assert.ok(pathWithParams.includes("floor=B1"));
  assert.ok(pathWithParams.includes("available=true"));
  assert.ok(!pathWithParams.includes("empty="), "Null parameters should be excluded");
});

test("Successful API requests and HTTP methods", async () => {
  let capturedUrl = "";
  let capturedOptions = {};

  globalThis.fetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return {
      ok: true,
      status: 200,
      headers: {
        get: (h) => (h.toLowerCase() === "content-type" ? "application/json" : null),
      },
      json: async () => ({ success: true, message: "OK", data: [1, 2, 3] }),
    };
  };

  try {
    // GET request
    const getData = await apiClient.get("/test-get", { headers: { "X-Test": "123" } });
    assert.deepEqual(getData, { success: true, message: "OK", data: [1, 2, 3] });
    assert.equal(capturedOptions.method, "GET");
    assert.equal(capturedOptions.headers["Accept"], "application/json");
    assert.equal(capturedOptions.headers["X-Test"], "123");
    assert.ok(capturedUrl.endsWith("/test-get"));

    // POST request with body serialization
    const postPayload = { mallName: "Grand Central", totalSlots: 150 };
    const postData = await apiClient.post("/test-post", postPayload);
    assert.equal(capturedOptions.method, "POST");
    assert.equal(capturedOptions.headers["Content-Type"], "application/json");
    assert.equal(capturedOptions.body, JSON.stringify(postPayload));
    assert.deepEqual(postData, { success: true, message: "OK", data: [1, 2, 3] });

    // PUT request
    await apiClient.put("/test-put", { updated: true });
    assert.equal(capturedOptions.method, "PUT");
    assert.equal(capturedOptions.body, JSON.stringify({ updated: true }));

    // PATCH request
    await apiClient.patch("/test-patch", { status: "OCCUPIED" });
    assert.equal(capturedOptions.method, "PATCH");
    assert.equal(capturedOptions.body, JSON.stringify({ status: "OCCUPIED" }));

    // DELETE request
    await apiClient.delete("/test-delete");
    assert.equal(capturedOptions.method, "DELETE");

    // Backward-compatible apiRequest helper
    const legacyData = await apiRequest("/test-legacy");
    assert.deepEqual(legacyData, { success: true, message: "OK", data: [1, 2, 3] });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Failed HTTP responses and status code normalization", async () => {
  // Test 400 Bad Request with server error message
  globalThis.fetch = async () => ({
    ok: false,
    status: 400,
    statusText: "Bad Request",
    headers: {
      get: () => "application/json",
    },
    json: async () => ({ success: false, message: "Invalid slot number format" }),
  });

  try {
    await apiClient.get("/bad-request");
    assert.fail("Should have thrown ApiError");
  } catch (error) {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 400);
    assert.equal(error.message, "Invalid slot number format");
    assert.equal(error.isClientError, true);
    assert.equal(error.isServerError, false);
    assert.equal(normalizeError(error), "Invalid slot number format");
  } finally {
    globalThis.fetch = originalFetch;
  }

  // Test 401 Unauthorized
  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    statusText: "Unauthorized",
    headers: { get: () => "application/json" },
    json: async () => ({ success: false }),
  });

  try {
    await apiClient.get("/unauthorized");
    assert.fail("Should have thrown ApiError");
  } catch (error) {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 401);
    assert.equal(error.isUnauthorized, true);
    assert.equal(normalizeError(error), STATUS_MESSAGES[401]);
  } finally {
    globalThis.fetch = originalFetch;
  }

  // Test 404 Not Found
  globalThis.fetch = async () => ({
    ok: false,
    status: 404,
    statusText: "Not Found",
    headers: { get: () => "application/json" },
    json: async () => ({ success: false, message: "API route not found" }),
  });

  try {
    await apiClient.get("/missing-slot");
    assert.fail("Should have thrown ApiError");
  } catch (error) {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 404);
    assert.equal(error.isNotFound, true);
    assert.equal(normalizeError(error), "API route not found");
  } finally {
    globalThis.fetch = originalFetch;
  }

  // Test 500 Internal Server Error
  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    statusText: "Internal Server Error",
    headers: { get: () => "application/json" },
    json: async () => ({ success: false, message: "Something went wrong" }),
  });

  try {
    await apiClient.get("/server-error");
    assert.fail("Should have thrown ApiError");
  } catch (error) {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 500);
    assert.equal(error.isServerError, true);
    assert.equal(normalizeError(error), "Something went wrong");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Network failures and Abort timeout handling", async () => {
  // Test network drop
  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };

  try {
    await apiClient.get("/network-fail");
    assert.fail("Should have thrown ApiError");
  } catch (error) {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 0);
    assert.equal(error.isNetworkError, true);
    assert.ok(error.message.includes("network connection"));
    assert.equal(normalizeError(error), error.message);
  } finally {
    globalThis.fetch = originalFetch;
  }

  // Test aborted request
  globalThis.fetch = async () => {
    const abortErr = new Error("The operation was aborted");
    abortErr.name = "AbortError";
    throw abortErr;
  };

  try {
    await apiClient.get("/abort-test");
    assert.fail("Should have thrown ApiError");
  } catch (error) {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 0);
    assert.equal(error.statusText, "Aborted");
    assert.equal(normalizeError(error), "The request timed out or was cancelled.");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Error normalization helper with various input types", () => {
  // Null / undefined
  assert.equal(normalizeError(null), "An unexpected error occurred.");
  assert.equal(normalizeError(undefined), "An unexpected error occurred.");

  // Plain string
  assert.equal(normalizeError("Custom error message"), "Custom error message");

  // Standard Error instance
  assert.equal(normalizeError(new Error("Standard Javascript error")), "Standard Javascript error");

  // ApiError with default status message fallback
  const apiErr = new ApiError({ status: 403, statusText: "Forbidden" });
  assert.equal(normalizeError(apiErr), STATUS_MESSAGES[403]);
});

test("Confirmed backend service: healthService interacts with /health", async () => {
  globalThis.fetch = async (url) => {
    assert.ok(url.endsWith("/health"));
    return {
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ success: true, message: "ParkEase API is running" }),
    };
  };

  try {
    const health = await getHealthStatus();
    assert.equal(health.success, true);
    assert.equal(health.message, "ParkEase API is running");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Pending backend service contracts are properly defined and documented", () => {
  assert.equal(AUTH_SERVICE_STATUS, "PENDING_BACKEND_IMPLEMENTATION");
  assert.equal(PENDING_AUTH_ROUTES.LOGIN, "/auth/login");
  assert.equal(PENDING_AUTH_ROUTES.REGISTER, "/auth/register");

  assert.equal(MALL_SERVICE_STATUS, "PENDING_BACKEND_IMPLEMENTATION");
  assert.equal(PENDING_MALL_ROUTES.LIST_MALLS, "/malls");

  assert.equal(PARKING_SERVICE_STATUS, "PENDING_BACKEND_IMPLEMENTATION");
  assert.equal(PENDING_PARKING_ROUTES.LIST_SLOTS, "/slots");

  assert.equal(BOOKING_SERVICE_STATUS, "PENDING_BACKEND_IMPLEMENTATION");
  assert.equal(PENDING_BOOKING_ROUTES.CREATE_BOOKING, "/bookings");
});
