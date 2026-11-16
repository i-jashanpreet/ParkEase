import { randomUUID } from "node:crypto";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import ROLES from "../constants/roles.js";
import { USER_STATUS } from "../constants/statuses.js";
import AppError from "../utils/AppError.js";
import { getRefreshTokenExpiryDate } from "../utils/cookies.js";
import { generateRefreshToken, hashToken, signAccessToken } from "../utils/jwt.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { requireFields, validateEmail, validatePassword } from "../utils/validators.js";

const invalidCredentials = () => new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
const invalidSession = () => new AppError(401, "Refresh session is invalid or expired", "INVALID_SESSION");
const refreshPattern = /^[a-f0-9]{64}$/;
// Compare against a fixed dummy hash for unknown email addresses.
const dummyHash = "$2b$10$9X5.OSdwQLIaRGs9cDKds.BhMnD1YewtWBXyHugoFF5JbT4FofsrO";

export function checkAccount(user) {
  if ([USER_STATUS.REJECTED, USER_STATUS.SUSPENDED].includes(user.status)) {
    throw new AppError(403, "Account access is unavailable", "ACCOUNT_BLOCKED");
  }
}

async function issueSession(user, metadata, familyId, session) {
  const accessToken = signAccessToken(user);
  const refreshToken = generateRefreshToken();
  const tokenHash = hashToken(refreshToken);
  await new RefreshToken({
    userId: user._id,
    familyId,
    tokenHash,
    expiresAt: getRefreshTokenExpiryDate(),
    ...metadata,
  }).save({ session });
  return { user, accessToken, refreshToken, tokenHash };
}

export async function register(body, metadata) {
  requireFields(body, ["name", "email", "password"]);
  const { name, phone, role = ROLES.USER } = body;
  if (![ROLES.USER, ROLES.MALL_OWNER].includes(role)) {
    throw new AppError(400, "Role cannot register publicly", "INVALID_ROLE");
  }
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
    throw new AppError(400, "Name must contain 2 to 100 characters", "INVALID_NAME");
  }
  if (phone != null && (typeof phone !== "string" || phone.trim().length > 20)) {
    throw new AppError(400, "Invalid phone number", "INVALID_PHONE");
  }
  const email = validateEmail(body.email);
  const passwordHash = await hashPassword(validatePassword(body.password));
  const status = role === ROLES.MALL_OWNER ? USER_STATUS.PENDING_APPROVAL : USER_STATUS.ACTIVE;
  const familyId = randomUUID();

  try {
    return await User.db.transaction(async (session) => {
      const user = await new User({ name, email, phone, passwordHash, role, status }).save({ session });
      return issueSession(user, metadata, familyId, session);
    });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.email) {
      throw new AppError(409, "Email address is already registered", "EMAIL_CONFLICT");
    }
    throw err;
  }
}

export async function login(body, metadata) {
  requireFields(body, ["email", "password"]);
  const email = validateEmail(body.email);
  if (typeof body.password !== "string") {
    throw new AppError(400, "Password must be a string", "INVALID_PASSWORD");
  }
  const user = await User.findOne({ email }).select("+passwordHash");
  const matches = await verifyPassword(body.password, user?.passwordHash ?? dummyHash);
  if (!user || !matches) throw invalidCredentials();
  checkAccount(user);
  return issueSession(user, metadata, randomUUID());
}

function revokeFamily(familyId, now, session) {
  return RefreshToken.updateMany({ familyId, revokedAt: null }, { $set: { revokedAt: now } }, { session });
}

export async function refresh(rawToken, metadata) {
  if (!refreshPattern.test(rawToken ?? "")) throw invalidSession();
  const tokenHash = hashToken(rawToken);
  const result = await RefreshToken.db.transaction(async (session) => {
    const now = new Date();
    const previous = await RefreshToken.findOne({ tokenHash }).session(session);
    if (!previous || previous.expiresAt <= now) return null;
    if (previous.revokedAt) {
      await revokeFamily(previous.familyId, now, session);
      return null;
    }

    const user = await User.findById(previous.userId).session(session);
    if (!user) return null;
    checkAccount(user);
    // Claim the previous token before inserting its replacement. Concurrent
    // writers retry the transaction and observe the committed revocation.
    previous.revokedAt = now;
    await previous.save({ session });
    const next = await issueSession(user, metadata, previous.familyId, session);
    previous.replacedByTokenHash = next.tokenHash;
    await previous.save({ session });
    return next;
  });
  // Return the error after the transaction so reuse revocation is committed.
  if (!result) throw invalidSession();
  return result;
}

export async function logout(rawToken) {
  if (!refreshPattern.test(rawToken ?? "")) return;
  await RefreshToken.db.transaction(async (session) => {
    const token = await RefreshToken.findOne({ tokenHash: hashToken(rawToken) }).session(session);
    const now = new Date();
    if (token && token.expiresAt > now) await revokeFamily(token.familyId, now, session);
  });
}
