import mongoose from "mongoose";
import AppError from "./AppError.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OBJECT_ID_HEX_REGEX = /^[a-fA-F0-9]{24}$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;

export function validateEmail(email) {
  if (typeof email !== "string") {
    throw new AppError(400, "Email address is required", "INVALID_EMAIL");
  }
  const normalized = email.trim().toLowerCase();
  if (
    normalized.length === 0 ||
    normalized.length > 254 ||
    !EMAIL_REGEX.test(normalized)
  ) {
    throw new AppError(400, "Invalid email address", "INVALID_EMAIL");
  }
  return normalized;
}

export function validatePassword(password) {
  if (typeof password !== "string") {
    throw new AppError(400, "Password is required", "INVALID_PASSWORD");
  }
  if (
    password.trim().length === 0 ||
    password.length < MIN_PASSWORD_LENGTH
  ) {
    throw new AppError(
      400,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
      "INVALID_PASSWORD",
    );
  }
  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    throw new AppError(
      400,
      `Password must not exceed ${MAX_PASSWORD_BYTES} bytes`,
      "INVALID_PASSWORD",
    );
  }
  return password;
}

export function validateObjectId(id, fieldName = "id") {
  if (id === undefined || id === null) {
    throw new AppError(400, `Invalid ${fieldName}`, "INVALID_OBJECT_ID");
  }
  const strId = String(id).trim();
  if (
    !OBJECT_ID_HEX_REGEX.test(strId) ||
    !mongoose.Types.ObjectId.isValid(strId)
  ) {
    throw new AppError(400, `Invalid ${fieldName}`, "INVALID_OBJECT_ID");
  }
  return strId;
}

export function requireFields(payload, fieldNames = []) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new AppError(400, "Request payload must be an object", "INVALID_BODY");
  }

  const missing = [];
  for (const field of fieldNames) {
    const value = payload[field];
    if (
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim().length === 0)
    ) {
      missing.push({ field, issue: `${field} is required` });
    }
  }

  if (missing.length > 0) {
    throw new AppError(
      400,
      `Missing required fields: ${missing.map((m) => m.field).join(", ")}`,
      "MISSING_REQUIRED_FIELDS",
      missing,
    );
  }
}
