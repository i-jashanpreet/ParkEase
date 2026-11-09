/**
 * Authentication Service (Sprint 2 Milestone)
 *
 * BACKEND STATUS: PENDING IMPLEMENTATION
 * The backend does not yet expose authentication endpoints.
 * Endpoints will be implemented by Ocean in Sprint 2:
 * - POST /api/auth/register (User registration)
 * - POST /api/auth/login (User authentication & JWT issuance)
 * - GET /api/auth/me (Current user session profile)
 *
 * DO NOT IMPLEMENT FAKE INTEGRATIONS.
 * This file serves as the architectural placeholder and contract definition.
 */

export const AUTH_SERVICE_STATUS = "PENDING_BACKEND_IMPLEMENTATION";

export const PENDING_AUTH_ROUTES = Object.freeze({
  REGISTER: "/auth/register",
  LOGIN: "/auth/login",
  ME: "/auth/me",
});

const authService = {
  status: AUTH_SERVICE_STATUS,
  pendingRoutes: PENDING_AUTH_ROUTES,
};

export default authService;
