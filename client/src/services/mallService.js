/**
 * Mall Management Service (Sprint 3 Milestone)
 *
 * BACKEND STATUS: PENDING IMPLEMENTATION
 * The backend does not yet expose mall management endpoints.
 * Endpoints will be implemented by Shikhar in Sprint 3:
 * - GET /api/malls (Mall listing)
 * - POST /api/malls (Mall submission)
 * - GET /api/malls/:id (Mall details)
 *
 * DO NOT IMPLEMENT FAKE INTEGRATIONS.
 * This file serves as the architectural placeholder and contract definition.
 */

export const MALL_SERVICE_STATUS = "PENDING_BACKEND_IMPLEMENTATION";

export const PENDING_MALL_ROUTES = Object.freeze({
  LIST_MALLS: "/malls",
  GET_MALL: "/malls/:id",
  CREATE_MALL: "/malls",
});

const mallService = {
  status: MALL_SERVICE_STATUS,
  pendingRoutes: PENDING_MALL_ROUTES,
};

export default mallService;
