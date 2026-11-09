import { apiClient } from "./api.js";

/**
 * Health service interacting with the confirmed /api/health endpoint.
 *
 * Confirmed Backend Route:
 * - GET /api/health -> { success: true, message: "ParkEase API is running" }
 */
export async function getHealthStatus(options = {}) {
  return apiClient.get("/health", options);
}

const healthService = {
  getHealthStatus,
};

export default healthService;
