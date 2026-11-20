import { sessionRequest } from "./authService.js";

export async function getAnalytics(role, params = {}, options = {}) {
  const path = role === "ADMIN" ? "/analytics/admin/overview" : "/analytics/owner/overview";
  const { data } = await sessionRequest(path, { ...options, params });
  return data;
}

export async function getMallAnalytics(mallId, params = {}, options = {}) {
  const { data } = await sessionRequest(`/analytics/owner/malls/${encodeURIComponent(mallId)}`, { ...options, params });
  return data;
}
