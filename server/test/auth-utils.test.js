import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import ROLES from "../src/constants/roles.js";
import { USER_STATUS } from "../src/constants/statuses.js";
import AppError from "../src/utils/AppError.js";
import errorHandler from "../src/middleware/errorHandler.js";
import { hashPassword, verifyPassword } from "../src/utils/password.js";
import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
} from "../src/utils/jwt.js";
import {
  REFRESH_COOKIE_NAME,
  getRefreshTokenTtlMs,
  getRefreshTokenExpiryDate,
  getRefreshCookieOptions,
  setRefreshCookie,
  clearRefreshCookie,
  parseCookies,
} from "../src/utils/cookies.js";
import {
  validateEmail,
  validatePassword,
  validateObjectId,
  requireFields,
} from "../src/utils/validators.js";
import User from "../src/models/User.js";
import RefreshToken from "../src/models/RefreshToken.js";

const TEST_SECRET = "test-only-access-secret-with-sufficient-length-32b";

test("1 & 2. Password hashing, verification, and incorrect/invalid password handling", async () => {
  const originalRounds = process.env.BCRYPT_SALT_ROUNDS;
  try {
    process.env.BCRYPT_SALT_ROUNDS = "4";
    const plain = "CorrectHorseBatteryStaple!9";
    const hash = await hashPassword(plain);

    assert.notEqual(hash, plain);
    assert.match(hash, /^\$2[abxy]\$04\$/);
    assert.equal(await verifyPassword(plain, hash), true);
    assert.equal(await verifyPassword("WrongPassword!9", hash), false);

    await assert.rejects(hashPassword(""), (err) => {
      assert.equal(err instanceof AppError, true);
      assert.equal(err.status, 400);
      return true;
    });
    await assert.rejects(verifyPassword("", hash), (err) => {
      assert.equal(err instanceof AppError, true);
      assert.equal(err.status, 400);
      return true;
    });
  } finally {
    if (originalRounds === undefined) delete process.env.BCRYPT_SALT_ROUNDS;
    else process.env.BCRYPT_SALT_ROUNDS = originalRounds;
  }
});

test("3, 4 & 5. JWT signing, verification, expired token rejection, and tampered token rejection", () => {
  const originalSecret = process.env.JWT_ACCESS_SECRET;
  const originalExpires = process.env.JWT_ACCESS_EXPIRES_IN;

  try {
    process.env.JWT_ACCESS_SECRET = TEST_SECRET;
    delete process.env.JWT_ACCESS_EXPIRES_IN;

    const userId = new mongoose.Types.ObjectId().toString();
    const token = signAccessToken({
      _id: userId,
      role: ROLES.MALL_OWNER,
      status: USER_STATUS.PENDING_APPROVAL,
    });

    const decoded = verifyAccessToken(token);
    assert.equal(decoded.sub, userId);
    assert.equal(decoded.role, ROLES.MALL_OWNER);
    assert.equal(decoded.status, USER_STATUS.PENDING_APPROVAL);
    assert.equal(decoded.exp - decoded.iat, 15 * 60);

    // 4. Expired JWT rejection
    const expiredToken = jwt.sign(
      { role: ROLES.USER, status: USER_STATUS.ACTIVE },
      TEST_SECRET,
      { algorithm: "HS256", subject: userId, expiresIn: -10 },
    );
    assert.throws(
      () => verifyAccessToken(expiredToken),
      (err) =>
        err instanceof AppError &&
        err.status === 401 &&
        err.code === "TOKEN_EXPIRED",
    );

    // 5. Tampered JWT rejection
    const parts = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ sub: userId, role: ROLES.ADMIN, status: USER_STATUS.ACTIVE }),
    ).toString("base64url");
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    assert.throws(
      () => verifyAccessToken(tamperedToken),
      (err) =>
        err instanceof AppError &&
        err.status === 401 &&
        err.code === "INVALID_TOKEN",
    );

    // Reject missing, placeholder, or <32-byte secret
    process.env.JWT_ACCESS_SECRET = "replace-with-a-random-32-byte-secret";
    assert.throws(
      () =>
        signAccessToken({
          id: userId,
          role: ROLES.USER,
          status: USER_STATUS.ACTIVE,
        }),
      (err) => err instanceof AppError && err.status === 500,
    );

    process.env.JWT_ACCESS_SECRET = "short-secret-only-24-byt";
    assert.throws(
      () =>
        signAccessToken({
          id: userId,
          role: ROLES.USER,
          status: USER_STATUS.ACTIVE,
        }),
      (err) => err instanceof AppError && err.status === 500,
    );
  } finally {
    if (originalSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = originalSecret;
    if (originalExpires === undefined) delete process.env.JWT_ACCESS_EXPIRES_IN;
    else process.env.JWT_ACCESS_EXPIRES_IN = originalExpires;
  }
});

test("6 & 7. Random opaque refresh-token generation and SHA-256 hash output", () => {
  const tokenA = generateRefreshToken();
  const tokenB = generateRefreshToken();

  assert.equal(typeof tokenA, "string");
  assert.equal(tokenA.length, 64);
  assert.match(tokenA, /^[a-f0-9]{64}$/);
  assert.notEqual(tokenA, tokenB);
  assert.equal(tokenA.includes("."), false);

  const hashA1 = hashToken(tokenA);
  const hashA2 = hashToken(tokenA);
  const hashB = hashToken(tokenB);

  assert.equal(hashA1, hashA2);
  assert.notEqual(hashA1, tokenA);
  assert.notEqual(hashA1, hashB);
  assert.match(hashA1, /^[a-f0-9]{64}$/);

  assert.throws(
    () => hashToken(""),
    (err) => err instanceof AppError && err.status === 400,
  );
});

test("8, 9 & 10. Cookie options in development/production, clearing attributes, and cookie parsing", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalRefreshExpires = process.env.JWT_REFRESH_EXPIRES_IN;
  try {
    delete process.env.JWT_REFRESH_EXPIRES_IN;

    // 8. Development cookie options
    process.env.NODE_ENV = "development";
    const devOptions = getRefreshCookieOptions();
    assert.deepEqual(devOptions, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    assert.equal(getRefreshTokenTtlMs(), devOptions.maxAge);
    const fixedNow = 1_700_000_000_000;
    assert.equal(
      getRefreshTokenExpiryDate(fixedNow).getTime(),
      fixedNow + devOptions.maxAge,
    );

    // 9. Production cookie options
    process.env.NODE_ENV = "production";
    const prodOptions = getRefreshCookieOptions();
    assert.deepEqual(prodOptions, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 10. Cookie setting and clearing attributes match
    let setCall = null;
    let clearCall = null;
    const mockRes = {
      cookie(name, val, opts) {
        setCall = { name, val, opts };
      },
      clearCookie(name, opts) {
        clearCall = { name, opts };
      },
    };

    const rawToken = generateRefreshToken();
    setRefreshCookie(mockRes, rawToken);
    clearRefreshCookie(mockRes);

    assert.equal(setCall.name, REFRESH_COOKIE_NAME);
    assert.equal(setCall.val, rawToken);
    assert.equal(clearCall.name, REFRESH_COOKIE_NAME);
    assert.equal(clearCall.opts.httpOnly, setCall.opts.httpOnly);
    assert.equal(clearCall.opts.secure, setCall.opts.secure);
    assert.equal(clearCall.opts.sameSite, setCall.opts.sameSite);
    assert.equal(clearCall.opts.path, setCall.opts.path);

    const parsed = parseCookies({
      headers: {
        cookie: `theme=light; ${REFRESH_COOKIE_NAME}=${rawToken}`,
      },
    });
    assert.equal(parsed[REFRESH_COOKIE_NAME], rawToken);
    assert.equal(parsed.theme, "light");
    process.env.JWT_REFRESH_EXPIRES_IN = "2h";
    assert.equal(getRefreshCookieOptions().maxAge, 7_200_000);
    assert.equal(getRefreshTokenExpiryDate(fixedNow).getTime(), fixedNow + 7_200_000);
    process.env.JWT_REFRESH_EXPIRES_IN = "0h";
    assert.throws(() => getRefreshCookieOptions(), { code: "CONFIG_ERROR" });
    assert.throws(() => getRefreshTokenExpiryDate(fixedNow), { code: "CONFIG_ERROR" });
  } finally {
    if (originalEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnv;
    if (originalRefreshExpires === undefined)
      delete process.env.JWT_REFRESH_EXPIRES_IN;
    else process.env.JWT_REFRESH_EXPIRES_IN = originalRefreshExpires;
  }
});

test("11 & 12. Email normalization/validation, ObjectId validation, password/field validators, and AppError handler", () => {
  assert.equal(validateEmail("  User.Name@Example.COM "), "user.name@example.com");
  assert.throws(
    () => validateEmail("not-an-email"),
    (err) => err instanceof AppError && err.status === 400,
  );

  const validId = new mongoose.Types.ObjectId().toString();
  assert.equal(validateObjectId(` ${validId} `), validId);
  assert.throws(
    () => validateObjectId("12345", "mallId"),
    (err) =>
      err instanceof AppError &&
      err.status === 400 &&
      err.message === "Invalid mallId",
  );

  assert.equal(validatePassword("StrongPass123"), "StrongPass123");
  assert.throws(
    () => validatePassword("short"),
    (err) => err instanceof AppError && err.status === 400,
  );

  assert.doesNotThrow(() =>
    requireFields({ email: "a@b.com", name: "Alice" }, ["email", "name"]),
  );
  assert.throws(
    () => requireFields({ email: "   " }, ["email", "password"]),
    (err) =>
      err instanceof AppError &&
      err.status === 400 &&
      Array.isArray(err.details) &&
      err.details.length === 2,
  );

  // Verify operational AppError formatting in errorHandler
  let status;
  let body;
  const res = {
    status(code) {
      status = code;
      return this;
    },
    json(payload) {
      body = payload;
    },
  };
  errorHandler(
    new AppError(403, "Account pending approval", "ACCOUNT_PENDING"),
    {},
    res,
    () => {},
  );
  assert.equal(status, 403);
  assert.deepEqual(body, {
    success: false,
    message: "Account pending approval",
    error: { code: "ACCOUNT_PENDING" },
  });
});

test("13. User model validation, defaults, and passwordHash serialization suppression", () => {
  const user = new User({
    name: "  Shikhar Srivastava  ",
    email: "  SHIKHAR@Example.com ",
    passwordHash: "$2b$10$abcdefghijklmnopqrstuv1234567890abcdefghijklmnopqrstu",
  });

  const validationError = user.validateSync();
  assert.equal(validationError, undefined);
  assert.equal(user.name, "Shikhar Srivastava");
  assert.equal(user.email, "shikhar@example.com");
  assert.equal(user.role, ROLES.USER);
  assert.equal(user.status, USER_STATUS.ACTIVE);

  const serialized = user.toJSON();
  assert.equal("passwordHash" in serialized, false);
  assert.equal(serialized.email, "shikhar@example.com");

  const invalidUser = new User({
    name: "A",
    email: "bad-email",
    role: "SUPERUSER",
    status: "UNKNOWN",
  });
  const err = invalidUser.validateSync();
  assert.ok(err);
  assert.ok(err.errors.name);
  assert.ok(err.errors.email);
  assert.ok(err.errors.passwordHash);
  assert.ok(err.errors.role);
  assert.ok(err.errors.status);
});

test("14. RefreshToken model validation, SHA-256 hash enforcement, and schema indexes", () => {
  const rawToken = generateRefreshToken();
  const tokenHash = hashToken(rawToken);
  const userId = new mongoose.Types.ObjectId();

  const validDoc = new RefreshToken({
    userId,
    tokenHash,
    familyId: "family-uuid-1234",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  assert.equal(validDoc.validateSync(), undefined);
  assert.equal(validDoc.revokedAt, null);
  assert.equal(validDoc.replacedByTokenHash, null);

  const invalidDoc = new RefreshToken({
    tokenHash: "plaintext-not-a-sha256-hash",
    replacedByTokenHash: "also-invalid-hash",
  });
  const err = invalidDoc.validateSync();
  assert.ok(err);
  assert.ok(err.errors.userId);
  assert.ok(err.errors.tokenHash);
  assert.ok(err.errors.familyId);
  assert.ok(err.errors.expiresAt);
  assert.ok(err.errors.replacedByTokenHash);

  const indexes = RefreshToken.schema.indexes();
  const hasUniqueTokenHash = indexes.some(
    ([fields, opts]) => fields.tokenHash === 1 && opts.unique === true,
  );
  const hasUserIdIndex = indexes.some(([fields]) => fields.userId === 1);
  const hasFamilyIdIndex = indexes.some(([fields]) => fields.familyId === 1);
  const hasTtlIndex = indexes.some(
    ([fields, opts]) =>
      fields.expiresAt === 1 && opts.expireAfterSeconds === 0,
  );

  assert.equal(hasUniqueTokenHash, true);
  assert.equal(hasUserIdIndex, true);
  assert.equal(hasFamilyIdIndex, true);
  assert.equal(hasTtlIndex, true);
});
