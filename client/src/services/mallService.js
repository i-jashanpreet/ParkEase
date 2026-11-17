import apiClient from "./api.js";

export const MALL_SERVICE_STATUS = "AVAILABLE";

export const PENDING_MALL_ROUTES = Object.freeze({
  LIST_MALLS: "/malls",
  GET_MALL: "/malls/:id",
  CREATE_MALL: "/malls",
});

let mallApiConfirmed = true;

export function isMallApiAvailable() {
  return mallApiConfirmed;
}

export function setMallApiAvailable(available) {
  mallApiConfirmed = Boolean(available);
}

/**
 * Normalizes a single mall record from raw backend response.
 * Preserves all backend fields without inventing unconfirmed mock data.
 */
export function normalizeMall(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const id = item._id || item.id || "";
  const name = item.name || item.mallName || "";
  const address = item.address || "";
  const city = item.city || item.location?.city || "";
  const state = item.state || item.location?.state || "";
  const pincode = item.pincode || item.zipCode || item.location?.pincode || "";

  // Location string: formatted from city/state/address if available
  let location = "";
  if (city && state) {
    location = `${city}, ${state}`;
  } else if (city) {
    location = city;
  } else if (address) {
    location = address;
  }

  return {
    id,
    name,
    address,
    description: item.description || "",
    hourlyRatePaise: item.hourlyRatePaise ?? null,
    city,
    state,
    pincode,
    location,
    contactPhone: item.contactPhone || item.phone || item.contact?.phone || null,
    contactEmail: item.contactEmail || item.email || item.contact?.email || null,
    operatingHours:
      item.operatingHours ||
      item.hours ||
      (item.openingTime && item.closingTime ? `${item.openingTime} - ${item.closingTime}` : null),
    totalSlots:
      typeof item.totalSlots === "number"
        ? item.totalSlots
        : typeof item.totalCapacity === "number"
          ? item.totalCapacity
          : item.parkingCapacity || null,
    availableSlots: typeof item.availableSlots === "number" ? item.availableSlots : null,
    floors: Array.isArray(item.floors) ? item.floors : [],
    amenities: Array.isArray(item.amenities) ? item.amenities : [],
    status: item.status || "ACTIVE",
    rates: item.rates || item.pricing || null,
    raw: item,
  };
}

/**
 * Normalizes a list of malls returned by the backend.
 * Extracts unique supported filter values (e.g. cities) present in the actual records.
 */
export function normalizeMallsResponse(response) {
  if (!response || typeof response !== "object") {
    return {
      malls: [],
      total: 0,
      supportedCities: [],
    };
  }

  const rawList = [response, response.data?.malls, response.data, response.malls]
    .find(Array.isArray) ?? [];

  const malls = rawList.map(normalizeMall).filter(Boolean);

  // Compute supported cities dynamically based strictly on available backend records
  const supportedCities = [...new Set(malls.map((m) => m.city).filter(Boolean))].sort();

  return {
    malls,
    total: response.data?.total ?? response.total ?? malls.length,
    supportedCities,
  };
}

/**
 * Retrieves the list of shopping malls with optional search and filter queries.
 */
export async function getMalls(params = {}, options = {}) {
  if (!mallApiConfirmed) {
    return {
      malls: [],
      total: 0,
      supportedCities: [],
      isPendingBackend: true,
    };
  }

  try {
    const response = await apiClient.get(PENDING_MALL_ROUTES.LIST_MALLS, {
      params,
      ...options,
    });
    const normalized = normalizeMallsResponse(response);
    return { ...normalized, isPendingBackend: false };
  } catch (err) {
    if (err.status === 404) {
      return {
        malls: [],
        total: 0,
        supportedCities: [],
        isPendingBackend: true,
      };
    }
    throw err;
  }
}

/**
 * Retrieves detailed information for a single mall by ID.
 */
export async function getMallById(id, options = {}) {
  if (!id) {
    return { mall: null, isPendingBackend: false };
  }

  if (!mallApiConfirmed) {
    return {
      mall: null,
      isPendingBackend: true,
    };
  }

  try {
    const endpoint = PENDING_MALL_ROUTES.GET_MALL.replace(":id", encodeURIComponent(id));
    const response = await apiClient.get(endpoint, options);
    const rawMall = response?.data?.mall ?? response?.data ?? response;
    const mall = normalizeMall(rawMall);
    return { mall, isPendingBackend: false };
  } catch (err) {
    if (err.status === 404) {
      return {
        mall: null,
        isPendingBackend: false,
      };
    }
    throw err;
  }
}

const mallService = {
  status: MALL_SERVICE_STATUS,
  pendingRoutes: PENDING_MALL_ROUTES,
  isMallApiAvailable,
  setMallApiAvailable,
  normalizeMall,
  normalizeMallsResponse,
  getMalls,
  getMallById,
};

export default mallService;
