import apiClient from "./api.js";

/**
 * Booking & Verification Service (Sprint 4 Milestone)
 *
 * BACKEND STATUS: PENDING IMPLEMENTATION
 * Live backend endpoints are currently pending implementation by Shikhar & Mehak (Sprint 4):
 * - POST /api/bookings (Create atomic booking reservation)
 * - GET /api/bookings (List user bookings)
 * - GET /api/bookings/:id (Booking details)
 * - PATCH /api/bookings/:id/cancel (Cancel booking)
 * - POST /api/bookings/verify-qr (Guard QR scan verification)
 *
 * Safe absence handling:
 * Unconfirmed endpoints are handled safely. If backend booking endpoints return 404 or
 * are pending, the service returns safe defaults ({ bookings: [], stats: ... }) or surfaces
 * status for friendly UI empty/unavailable states without fake data.
 */

export const BOOKING_SERVICE_STATUS = "PENDING_BACKEND_IMPLEMENTATION";

export const PENDING_BOOKING_ROUTES = Object.freeze({
  CREATE_BOOKING: "/bookings",
  LIST_BOOKINGS: "/bookings",
  GET_BOOKING: "/bookings/:id",
  CANCEL_BOOKING: "/bookings/:id/cancel",
  VERIFY_QR: "/bookings/verify-qr",
});

let bookingApiConfirmed = false;

export function isBookingApiAvailable() {
  return bookingApiConfirmed;
}

export function setBookingApiAvailable(available) {
  bookingApiConfirmed = Boolean(available);
}

/**
 * Normalizes a list of bookings and computes summary counts.
 */
export function normalizeBookingsResponse(response) {
  if (!response || typeof response !== "object") {
    return {
      bookings: [],
      stats: { total: 0, active: 0, completed: 0, cancelled: 0 },
    };
  }

  const rawList = Array.isArray(response)
    ? response
    : Array.isArray(response.data)
      ? response.data
      : Array.isArray(response.bookings)
        ? response.bookings
        : [];

  const bookings = rawList.map((item) => ({
    id: item._id || item.id || `b_${Math.random().toString(36).substr(2, 9)}`,
    mallName: item.mallName || item.mall?.name || "ParkEase Partner Mall",
    slotCode: item.slotCode || item.slot?.code || "Bay --",
    floor: item.floor || item.slot?.floor || "Level --",
    status: (item.status || "CONFIRMED").toUpperCase(),
    startTime: item.startTime || item.createdAt || new Date().toISOString(),
    endTime: item.endTime || null,
    totalAmount: typeof item.totalAmount === "number" ? item.totalAmount : item.amount || 0,
    vehicleNumber: item.vehicleNumber || item.licensePlate || "N/A",
    qrCode: item.qrCode || null,
  }));

  const stats = {
    total: bookings.length,
    active: bookings.filter((b) => ["ACTIVE", "CONFIRMED", "IN_PROGRESS"].includes(b.status)).length,
    completed: bookings.filter((b) => b.status === "COMPLETED").length,
    cancelled: bookings.filter((b) => b.status === "CANCELLED").length,
  };

  return { bookings, stats };
}

/**
 * Retrieves the bookings for the currently authenticated user.
 * If backend booking endpoints are pending, safely returns empty result with pending flag.
 */
export async function getUserBookings(options = {}) {
  if (!bookingApiConfirmed) {
    return {
      bookings: [],
      stats: { total: 0, active: 0, completed: 0, cancelled: 0 },
      isPendingBackend: true,
    };
  }

  try {
    const response = await apiClient.get(PENDING_BOOKING_ROUTES.LIST_BOOKINGS, options);
    const normalized = normalizeBookingsResponse(response);
    return { ...normalized, isPendingBackend: false };
  } catch (err) {
    if (err.status === 404) {
      return {
        bookings: [],
        stats: { total: 0, active: 0, completed: 0, cancelled: 0 },
        isPendingBackend: true,
      };
    }
    throw err;
  }
}

const bookingService = {
  status: BOOKING_SERVICE_STATUS,
  pendingRoutes: PENDING_BOOKING_ROUTES,
  isBookingApiAvailable,
  setBookingApiAvailable,
  getUserBookings,
  normalizeBookingsResponse,
};

export default bookingService;
