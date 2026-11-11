export {
  default as apiClient,
  request,
  apiRequest,
  getApiBaseUrl,
  buildUrl,
  tokenStorage,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  setUnauthorizedHandler,
} from "./api.js";
export { ApiError, normalizeError, STATUS_MESSAGES } from "./apiError.js";
export { default as healthService, getHealthStatus } from "./healthService.js";
export {
  default as authService,
  AUTH_SERVICE_STATUS,
  PENDING_AUTH_ROUTES,
  isBackendAuthAvailable,
  setBackendAuthAvailable,
  login,
  register,
  getCurrentUser,
  logout,
  normalizeAuthResponse,
} from "./authService.js";
export { default as mallService, MALL_SERVICE_STATUS, PENDING_MALL_ROUTES } from "./mallService.js";
export { default as parkingService, PARKING_SERVICE_STATUS, PENDING_PARKING_ROUTES } from "./parkingService.js";
export {
  default as bookingService,
  BOOKING_SERVICE_STATUS,
  PENDING_BOOKING_ROUTES,
  isBookingApiAvailable,
  setBookingApiAvailable,
  getUserBookings,
  normalizeBookingsResponse,
} from "./bookingService.js";
export { ROLES } from "../constants/roles.js";
