const API_URL = (
  import.meta.env?.VITE_API_URL || "http://localhost:5001/api"
).replace(/\/$/, "");

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { credentials: "include", ...options, headers });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("Could not reach the ParkEase API. Check your connection and try again.");
  }

  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true) {
    throw Object.assign(new Error(body?.message || `API request failed (${response.status})`), {
      status: response.status,
      code: body?.error?.code,
    });
  }
  return body;
}
