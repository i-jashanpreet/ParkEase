/**
 * Booking & Verification Service (Sprint 4 Milestone)
 *
 * BACKEND STATUS: PENDING IMPLEMENTATION
 * The backend does not yet expose booking endpoints.
 * Endpoints will be implemented by Shikhar & Mehak in Sprint 4:
 * - POST /api/bookings (Create atomic booking reservation)
 * - GET /api/bookings (List user bookings)
 * - GET /api/bookings/:id (Booking details)
 * - PATCH /api/bookings/:id/cancel (Cancel booking)
 * - POST /api/bookings/verify-qr (Guard QR scan verification)
 *
 * DO NOT IMPLEMENT FAKE INTEGRATIONS.
 * This file serves as the architectural placeholder and contract definition.
 */

export const BOOKING_SERVICE_STATUS = "PENDING_BACKEND_IMPLEMENTATION";

export const PENDING_BOOKING_ROUTES = Object.freeze({
  CREATE_BOOKING: "/bookings",
  LIST_BOOKINGS: "/bookings",
  GET_BOOKING: "/bookings/:id",
  CANCEL_BOOKING: "/bookings/:id/cancel",
  VERIFY_QR: "/bookings/verify-qr",
});

const bookingService = {
  status: BOOKING_SERVICE_STATUS,
  pendingRoutes: PENDING_BOOKING_ROUTES,
};

export default bookingService;
