import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import test from "node:test";
import mongoose from "mongoose";
import app from "../src/app.js";
import User from "../src/models/User.js";
import RefreshToken from "../src/models/RefreshToken.js";
import { hashToken } from "../src/utils/jwt.js";

const origin = process.env.CLIENT_URL || "http://localhost:5173";
const csrf = { Origin: origin, "X-Requested-With": "XMLHttpRequest" };
const account = { name: "Parking User", email: "Driver@Example.test", password: "test-password" };

async function serve(t) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return (path, { body, headers = {}, method = "POST", area = "auth" } = {}) =>
    fetch(`http://127.0.0.1:${server.address().port}/api/${area}/${path}`, {
      method,
      headers: { ...headers, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: JSON.stringify(body),
    });
}

function readCookie(response) {
  const cookie = response.headers.get("set-cookie");
  assert.match(cookie, /^parkease_refresh_token=[a-f0-9]{64};/);
  assert.match(cookie, /; HttpOnly/);
  assert.match(cookie, /; Path=\/api\/auth/);
  return cookie.split(";")[0];
}

test("auth lifecycle on MongoDB", { skip: !process.env.AUTH_TEST_MONGODB_URI && "Set AUTH_TEST_MONGODB_URI to an isolated replica set" }, async (t) => {
  process.env.JWT_ACCESS_SECRET = randomUUID() + randomUUID();
  process.env.BCRYPT_SALT_ROUNDS = "4";
  await mongoose.connect(process.env.AUTH_TEST_MONGODB_URI, {
    dbName: `parkease_auth_test_${randomUUID().replaceAll("-", "")}`,
    serverSelectionTimeoutMS: 5000,
  });
  t.after(async () => {
    try {
      await mongoose.connection.dropDatabase();
    } finally {
      await mongoose.disconnect();
    }
  });
  await Promise.all([User.init(), RefreshToken.init()]);
  const request = await serve(t);
  const register = (body) => request("register", { body });
  const login = (body = account) => request("login", { body, headers: { "User-Agent": "integration-test" } });
  const refresh = (Cookie) => request("refresh", { headers: { ...csrf, Cookie } });
  const logout = (Cookie) => request("logout", { headers: { ...csrf, Cookie } });
  const me = (token) => request("me", { method: "GET", headers: { Authorization: `Bearer ${token}` } });

  const signup = await register({ ...account, status: "SUSPENDED" });
  assert.equal(signup.status, 201);
  const firstCookie = readCookie(signup);
  const { data } = await signup.json();
  assert.equal(data.user.email, account.email.toLowerCase());
  assert.equal(data.user.role, "USER");
  assert.equal(data.user.status, "ACTIVE");
  assert.equal(data.user.passwordHash, undefined);
  assert.equal(data.refreshToken, undefined);
  assert.equal((await register(account)).status, 409);

  const owner = await register({ ...account, email: "owner@example.test", role: "MALL_OWNER" });
  assert.equal(owner.status, 201);
  const ownerData = (await owner.json()).data;
  assert.equal(ownerData.user.status, "PENDING_APPROVAL");
  assert.equal((await me(ownerData.accessToken)).status, 200);

  assert.equal((await login({ ...account, password: "wrong-password" })).status, 401);
  assert.equal((await login({ ...account, email: "unknown@example.test" })).status, 401);
  const signedIn = await login();
  assert.equal(signedIn.status, 200);
  const loginCookie = readCookie(signedIn);
  const originalHash = hashToken(loginCookie.split("=")[1]);
  const stored = await RefreshToken.findOne({ tokenHash: originalHash });
  assert.equal(stored.userAgent, "integration-test");
  assert.equal((await me(data.accessToken)).status, 200);

  const attempts = await Promise.all([refresh(loginCookie), refresh(loginCookie)]);
  assert.deepEqual(attempts.map((r) => r.status).sort(), [200, 401]);
  const rotatedCookie = readCookie(attempts.find((r) => r.status === 200));
  assert.notEqual(rotatedCookie, loginCookie);
  assert.equal((await refresh(rotatedCookie)).status, 401);
  assert.equal(await RefreshToken.countDocuments({ familyId: stored.familyId, revokedAt: null }), 0);

  const completed = await logout(firstCookie);
  assert.equal(completed.status, 200);
  assert.match(completed.headers.get("set-cookie"), /^parkease_refresh_token=;/);
  assert.equal((await logout(firstCookie)).status, 200);
  assert.equal((await refresh(firstCookie)).status, 401);

  const expiringCookie = readCookie(await login());
  await RefreshToken.updateOne({ tokenHash: hashToken(expiringCookie.split("=")[1]) }, { expiresAt: new Date(0) });
  assert.equal((await refresh(expiringCookie)).status, 401);

  await t.test("Admin bootstrap and owner approval enforce live permissions", async () => {
    const seedUri = new URL(process.env.AUTH_TEST_MONGODB_URI);
    seedUri.pathname = `/${mongoose.connection.name}`;
    const admin = { email: "admin@example.test", password: randomUUID() };
    const seed = (email = admin.email, password = admin.password) =>
      promisify(execFile)(process.execPath, [fileURLToPath(new URL("../src/scripts/seedAdmin.js", import.meta.url))], {
        env: { ...process.env, MONGODB_URI: seedUri.href, ADMIN_EMAIL: email, ADMIN_PASSWORD: password, ADMIN_NAME: "Test Admin" },
      });
    await assert.rejects(seed(account.email), (err) => err.code === 1 && /non-admin/.test(err.stderr));
    await assert.rejects(seed(admin.email, "replace-with-a-strong-password"), (err) => err.code === 1 && /ADMIN_PASSWORD/.test(err.stderr));
    await seed();
    await seed(admin.email, randomUUID());
    await seed("different-admin@example.test");
    assert.equal(await User.countDocuments({ role: "ADMIN" }), 1);

    const adminLogin = await login(admin);
    assert.equal(adminLogin.status, 200);
    const { data: adminData } = await adminLogin.json();
    const adminRequest = (path, token, body) => request(path, {
      area: "admin",
      method: body ? "PATCH" : "GET",
      body,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const list = (token) => adminRequest("mall-owners?status=PENDING_APPROVAL", token);
    const update = (id, status, extra) => adminRequest(`mall-owners/${id}/status`, adminData.accessToken, { status, ...extra });
    assert.equal((await list()).status, 401);
    assert.equal((await list(data.accessToken)).status, 403);
    assert.equal((await list(ownerData.accessToken)).status, 403);

    const pending = await list(adminData.accessToken);
    assert.equal(pending.status, 200);
    assert.deepEqual((await pending.json()).data.mallOwners.map((user) => user._id), [ownerData.user._id]);
    assert.equal((await update(data.user._id, "ACTIVE")).status, 404);
    assert.equal((await update(ownerData.user._id, "SUSPENDED")).status, 409);

    const approval = await update(ownerData.user._id, "ACTIVE", { approvedBy: data.user._id });
    assert.equal(approval.status, 200);
    const { user: approved } = (await approval.json()).data;
    assert.equal(approved.approvedBy, adminData.user._id);
    assert.ok(approved.approvedAt);
    assert.equal((await (await me(ownerData.accessToken)).json()).data.user.status, "ACTIVE");
    assert.equal((await update(ownerData.user._id, "SUSPENDED")).status, 200);
    assert.equal((await me(ownerData.accessToken)).status, 403);
    assert.equal((await refresh(readCookie(owner))).status, 403);

    const secondOwner = await register({ ...account, email: "second-owner@example.test", role: "MALL_OWNER" });
    assert.equal(secondOwner.status, 201);
    const secondId = (await secondOwner.json()).data.user._id;
    assert.equal((await update(secondId, "REJECTED")).status, 400);
    const rejected = await update(secondId, "REJECTED", { rejectionReason: "  Incomplete details  " });
    assert.equal(rejected.status, 200);
    assert.equal((await rejected.json()).data.user.rejectionReason, "Incomplete details");
    assert.equal((await update(secondId, "ACTIVE")).status, 409);

    await User.updateOne({ _id: adminData.user._id }, { role: "USER" });
    assert.equal((await list(adminData.accessToken)).status, 403);
  });

  await User.updateOne({ _id: data.user._id }, { role: "MALL_OWNER" });
  assert.equal((await (await me(data.accessToken)).json()).data.user.role, "MALL_OWNER");
  await User.updateOne({ _id: data.user._id }, { status: "SUSPENDED" });
  assert.equal((await me(data.accessToken)).status, 403);
  assert.equal((await login()).status, 403);
});

test("auth rejects privileged registration and cross-origin cookie operations before database access", async (t) => {
  const request = await serve(t);
  assert.equal((await request("mall-owners", { area: "admin", method: "GET" })).status, 401);
  for (const role of ["ADMIN", "GUARD"]) {
    const response = await request("register", { body: { ...account, role } });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_ROLE");
  }
  for (const action of ["refresh", "logout"]) {
    for (const headers of [{ Origin: origin }, { ...csrf, Origin: "https://wrong.example" }]) {
      assert.equal((await request(action, { headers })).status, 403);
    }
  }
  const preflight = await request("login", {
    method: "OPTIONS",
    headers: { Origin: origin, "Access-Control-Request-Method": "POST" },
  });
  assert.equal(preflight.headers.get("access-control-allow-origin"), origin);
  assert.equal(preflight.headers.get("access-control-allow-credentials"), "true");
  let limited = await request("login", { body: {} });
  for (let i = 0; i < 15 && limited.status === 400; i += 1) {
    limited = await request("login", { body: {} });
  }
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
});
