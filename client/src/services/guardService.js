import { sessionRequest } from "./authService.js";

const mallPath = (mallId) => `/malls/${encodeURIComponent(mallId)}`;

export async function listMallGuards(mallId, options = {}) {
  const { data } = await sessionRequest(`${mallPath(mallId)}/guards`, options);
  return data.guards;
}

export async function createGuard(mallId, fields) {
  const { data } = await sessionRequest(`${mallPath(mallId)}/guards`, { method: "POST", body: fields });
  return data;
}

export async function assignGuard(mallId, fields) {
  const { data } = await sessionRequest(`${mallPath(mallId)}/guard-assignments`, { method: "POST", body: fields });
  return data.assignment;
}

export async function updateAssignment(id, fields) {
  const { data } = await sessionRequest(`/guards/assignments/${encodeURIComponent(id)}`, { method: "PATCH", body: fields });
  return data.assignment;
}

export async function myAssignments(options = {}) {
  const { data } = await sessionRequest("/guards/my-assignments", options);
  return data.assignments;
}
