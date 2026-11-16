import bcrypt from "bcryptjs";
import AppError from "./AppError.js";

const DEFAULT_SALT_ROUNDS = 10;
const MAX_BCRYPT_BYTES = 72;

function getSaltRounds() {
  const raw = process.env.BCRYPT_SALT_ROUNDS;
  if (raw === undefined || raw === "") {
    return DEFAULT_SALT_ROUNDS;
  }
  const rounds = Number(raw);
  if (!Number.isInteger(rounds) || rounds < 4 || rounds > 31) {
    throw new AppError(
      500,
      "Invalid BCRYPT_SALT_ROUNDS configuration",
      "CONFIG_ERROR",
    );
  }
  return rounds;
}

export async function hashPassword(plainPassword) {
  if (typeof plainPassword !== "string" || plainPassword.trim().length === 0) {
    throw new AppError(
      400,
      "Password must be a non-empty string",
      "INVALID_PASSWORD",
    );
  }
  if (Buffer.byteLength(plainPassword, "utf8") > MAX_BCRYPT_BYTES) {
    throw new AppError(
      400,
      "Password must not exceed 72 bytes",
      "INVALID_PASSWORD",
    );
  }
  const saltRounds = getSaltRounds();
  return bcrypt.hash(plainPassword, saltRounds);
}

export async function verifyPassword(plainPassword, passwordHash) {
  if (
    typeof plainPassword !== "string" ||
    plainPassword.length === 0 ||
    typeof passwordHash !== "string" ||
    passwordHash.trim().length === 0
  ) {
    throw new AppError(
      400,
      "Password and passwordHash must be non-empty strings",
      "INVALID_PASSWORD_INPUT",
    );
  }
  if (Buffer.byteLength(plainPassword, "utf8") > MAX_BCRYPT_BYTES) {
    return false;
  }
  return bcrypt.compare(plainPassword, passwordHash);
}
