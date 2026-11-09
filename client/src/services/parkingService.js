/**
 * Parking Slot Service (Sprint 3 Milestone)
 *
 * BACKEND STATUS: PENDING IMPLEMENTATION
 * The backend does not yet expose slot management endpoints.
 * Endpoints will be implemented by Shikhar in Sprint 3:
 * - GET /api/slots (Slot inventory and availability query)
 * - POST /api/slots (Create slot)
 * - PATCH /api/slots/:id (Update slot status)
 *
 * DO NOT IMPLEMENT FAKE INTEGRATIONS.
 * This file serves as the architectural placeholder and contract definition.
 */

export const PARKING_SERVICE_STATUS = "PENDING_BACKEND_IMPLEMENTATION";

export const PENDING_PARKING_ROUTES = Object.freeze({
  LIST_SLOTS: "/slots",
  GET_SLOT: "/slots/:id",
  UPDATE_SLOT: "/slots/:id",
});

const parkingService = {
  status: PARKING_SERVICE_STATUS,
  pendingRoutes: PENDING_PARKING_ROUTES,
};

export default parkingService;
