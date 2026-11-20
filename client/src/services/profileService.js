import { sessionRequest, signOut } from "./authService.js";

export async function getProfile(options = {}) {
  const { data } = await sessionRequest("/users/profile", options);
  return data.user;
}

export async function updateProfile(fields) {
  const { data } = await sessionRequest("/users/profile", { method: "PATCH", body: fields });
  return data.user;
}

export async function changePassword(currentPassword, newPassword) {
  await sessionRequest("/users/password", { method: "PATCH", body: { currentPassword, newPassword } });
  await signOut();
}
