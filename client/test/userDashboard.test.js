import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import DashboardPage from "../src/pages/DashboardPage.jsx";
import { AuthContext } from "../src/context/authContextInstance.js";
import { ROLES } from "../src/constants/roles.js";
import bookingService, {
  getUserBookings,
  normalizeBookingsResponse,
  isBookingApiAvailable,
  setBookingApiAvailable,
  PENDING_BOOKING_ROUTES,
  BOOKING_SERVICE_STATUS,
} from "../src/services/bookingService.js";

const originalFetch = globalThis.fetch;

function renderDashboardWithUser(userContextValue, dashboardProps = {}) {
  return renderToStaticMarkup(
    React.createElement(
      AuthContext.Provider,
      { value: userContextValue },
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(DashboardPage, dashboardProps)
      )
    )
  );
}

test("bookingService: contract constants and normalization helper", () => {
  assert.equal(bookingService.status, BOOKING_SERVICE_STATUS);
  assert.equal(PENDING_BOOKING_ROUTES.LIST_BOOKINGS, "/bookings");
  assert.equal(PENDING_BOOKING_ROUTES.CREATE_BOOKING, "/bookings");

  // Empty or invalid input
  const emptyRes = normalizeBookingsResponse(null);
  assert.deepEqual(emptyRes.bookings, []);
  assert.equal(emptyRes.stats.total, 0);

  // List normalization & stats calculation
  const sampleBookings = [
    {
      _id: "b1",
      mallName: "Phoenix Marketcity",
      slotCode: "B1-04",
      floor: "B1",
      status: "ACTIVE",
      totalAmount: 120,
      vehicleNumber: "MH 02 AB 1234",
    },
    {
      _id: "b2",
      mallName: "Palladium",
      slotCode: "P2-19",
      floor: "P2",
      status: "COMPLETED",
      totalAmount: 250,
      vehicleNumber: "MH 02 AB 1234",
    },
    {
      _id: "b3",
      mallName: "Inorbit",
      slotCode: "B2-10",
      floor: "B2",
      status: "CANCELLED",
      totalAmount: 0,
      vehicleNumber: "MH 02 AB 1234",
    },
  ];

  const normalized = normalizeBookingsResponse({ data: sampleBookings });
  assert.equal(normalized.bookings.length, 3);
  assert.equal(normalized.stats.total, 3);
  assert.equal(normalized.stats.active, 1);
  assert.equal(normalized.stats.completed, 1);
  assert.equal(normalized.stats.cancelled, 1);
});

test("bookingService: safe absence when backend booking API is pending", async () => {
  setBookingApiAvailable(false);
  assert.equal(isBookingApiAvailable(), false);

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
    const res = await getUserBookings();
    assert.equal(res.isPendingBackend, true);
    assert.deepEqual(res.bookings, []);
    assert.equal(res.stats.total, 0);
    assert.equal(fetchCalled, false, "Should not call fetch when booking API is pending");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("DashboardPage: personalized welcome section with authenticated user details", () => {
  const driverUser = {
    id: "user-101",
    name: "Aarav Sharma",
    email: "aarav.driver@parkease.com",
    role: ROLES.USER,
  };

  const html = renderDashboardWithUser({
    user: driverUser,
    isAuthenticated: true,
    isLoading: false,
  });

  // Welcome greeting
  assert.match(html, /Welcome back, Aarav Sharma!/);
  assert.match(html, /USER PORTAL/);
  assert.match(html, /Driver Account Active/);

  // Metadata pills
  assert.match(html, /aarav\.driver@parkease\.com/);
  assert.match(html, /Role: <strong[^>]*>USER<\/strong>/);
  assert.match(html, /Active Session/);
});

test("DashboardPage: summary metric cards render Total, Active, and Completed Bookings", () => {
  const driverUser = {
    id: "user-102",
    name: "Pooja Verma",
    email: "pooja@example.com",
    role: ROLES.USER,
  };

  const html = renderDashboardWithUser({
    user: driverUser,
    isAuthenticated: true,
    isLoading: false,
  });

  // Summary cards
  assert.match(html, /Total Bookings/);
  assert.match(html, /Active Bookings/);
  assert.match(html, /Completed Bookings/);
  assert.match(html, /Parking summary statistics/);
});

test("DashboardPage: quick action cards render Find Parking and My Bookings", () => {
  const driverUser = {
    id: "user-103",
    name: "Rohan Driver",
    email: "rohan@example.com",
    role: ROLES.USER,
  };

  const html = renderDashboardWithUser({
    user: driverUser,
    isAuthenticated: true,
    isLoading: false,
  });

  // Find Parking quick action
  assert.match(html, /Find Parking/);
  assert.match(html, /Search Available Slots/);

  // My Bookings quick action
  assert.match(html, /My Bookings/);
  assert.match(html, /View Reservations/);
});

test("DashboardPage: empty and pending backend states without fake data", () => {
  const driverUser = {
    id: "user-104",
    name: "Maya Patel",
    email: "maya@example.com",
    role: ROLES.USER,
  };

  const html = renderDashboardWithUser({
    user: driverUser,
    isAuthenticated: true,
    isLoading: false,
  });

  // Empty state title & description
  assert.match(html, /No Parking Reservations Found/);
  assert.match(html, /haven(&#x27;|')t reserved any parking bays yet/);
  assert.match(html, /Find Parking Now/);
  assert.match(html, /Sprint 4 Note/);
});

test("DashboardPage: populated bookings list renders booking cards, status, vehicle, and bay info", () => {
  const driverUser = {
    id: "user-105",
    name: "Vikram Malhotra",
    email: "vikram@example.com",
    role: ROLES.USER,
  };

  const sampleBookings = [
    {
      id: "bk-1",
      mallName: "Phoenix Marketcity (Kurla)",
      slotCode: "Bay B1-14",
      floor: "Level B1",
      status: "ACTIVE",
      totalAmount: 80,
      vehicleNumber: "MH 01 AB 9999",
      startTime: "2026-11-11T10:00:00Z",
    },
    {
      id: "bk-2",
      mallName: "R City Mall (Ghatkopar)",
      slotCode: "Bay B2-05",
      floor: "Level B2",
      status: "COMPLETED",
      totalAmount: 150,
      vehicleNumber: "MH 01 AB 9999",
      startTime: "2026-11-10T14:00:00Z",
    },
  ];

  const sampleStats = { total: 2, active: 1, completed: 1 };

  const html = renderDashboardWithUser(
    { user: driverUser, isAuthenticated: true, isLoading: false },
    { initialLoading: false, initialBookings: sampleBookings, initialStats: sampleStats }
  );

  assert.match(html, /Phoenix Marketcity \(Kurla\)/);
  assert.match(html, /Bay B1-14/);
  assert.match(html, /MH 01 AB 9999/);
  assert.match(html, /QR Pass ↗/);
  assert.match(html, /R City Mall \(Ghatkopar\)/);
  assert.match(html, /COMPLETED/);
});

test("DashboardPage: renders loading skeleton states while data is loading", () => {
  const driverUser = {
    id: "user-106",
    name: "Simran Kaur",
    email: "simran@example.com",
    role: ROLES.USER,
  };

  const html = renderDashboardWithUser(
    { user: driverUser, isAuthenticated: true, isLoading: false },
    { initialLoading: true }
  );

  assert.match(html, /aria-busy="true"/);
  assert.match(html, /aria-label="Loading reservations"/);
  assert.match(html, /skeleton/);
});

test("DashboardPage: strictly restricts access for non-USER roles (ADMIN, MALL_OWNER, GUARD)", () => {
  // Case 1: ADMIN role
  const adminUser = {
    id: "admin-1",
    name: "System Admin",
    email: "admin@parkease.com",
    role: ROLES.ADMIN,
  };

  const adminHtml = renderDashboardWithUser({
    user: adminUser,
    isAuthenticated: true,
    isLoading: false,
  });

  assert.match(adminHtml, /403 Forbidden/);
  assert.match(adminHtml, /Access Restricted/);
  assert.match(adminHtml, /This dashboard is dedicated to <strong[^>]*>Driver \/ Customer<\/strong> accounts/);
  assert.match(adminHtml, /ADMIN/);
  assert.ok(!adminHtml.includes("Total Bookings"), "Should not render user metrics for admin");

  // Case 2: MALL_OWNER role
  const ownerUser = {
    id: "owner-1",
    name: "Mall Owner",
    email: "owner@parkease.com",
    role: ROLES.MALL_OWNER,
  };

  const ownerHtml = renderDashboardWithUser({
    user: ownerUser,
    isAuthenticated: true,
    isLoading: false,
  });

  assert.match(ownerHtml, /403 Forbidden/);
  assert.match(ownerHtml, /MALL_OWNER/);
});
