# ParkEase — Milestone 1 Implementation Plan: Authentication & RBAC (`docs/MILESTONE_1_PLAN.md`)

> **Document Status:** Finalized Milestone 1 Specification (Phases 1A–1D Implemented)
> **Milestone Goal:** Deliver complete backend and frontend Authentication, In-Memory Access Tokens, `HttpOnly` Cookie Refresh Token Rotation with SHA-256 DB Hashing, Database-Backed Auth Middleware, Credentialed CORS + CSRF Protection, Role-Based Access Control (`USER`, `MALL_OWNER`, `GUARD`, `ADMIN`), Admin Bootstrap Script, Mall Owner Account Approval Workflow, and Automated Tests.

---

## 1. Scope & Product Rules for Milestone 1

1. **Public Registration (`POST /api/auth/register`):**
   - Allows registering as `USER` (`User.status = "ACTIVE"`) or `MALL_OWNER` (`User.status = "PENDING_APPROVAL"`).
   - Strictly forbids registering as `ADMIN` or `GUARD` (`400 Bad Request`).
2. **Mall Owner Account Approval (`PATCH /api/admin/mall-owners/:userId/status`):**
   - `MALL_OWNER` accounts require explicit `ADMIN` approval (`PENDING_APPROVAL -> ACTIVE` or `REJECTED`) before they are permitted to perform owner actions (verified via `requireApprovedOwner` middleware).
   - While in `PENDING_APPROVAL`, a `MALL_OWNER` can log in and call `GET /api/auth/me` to see their pending status on the frontend dashboard, and can log out.
3. **Guard Account Provisioning (Foundation in Milestone 1):**
   - Guard accounts (`role: "GUARD"`, `status: "ACTIVE"`) cannot self-register.
   - Milestone 1 establishes the `GUARD` role enforcement and user creation helper; full mall-bound guard provisioning (`GuardAssignment`) connects when the `Mall` model is introduced in Milestone 2.
4. **In-Memory JWT Access Token + `HttpOnly` Cookie Refresh Token Strategy:**
   - **Access Token:** Short-lived (`15m`) signed JWT (`HS256` with `>= 32`-byte `JWT_ACCESS_SECRET`) containing `{ sub, role, status }`. Returned in the JSON response body (`data.accessToken`) and held **only in React memory** (`AuthContext` / `api.js`), never in `localStorage` or `sessionStorage`.
   - **Refresh Token:** Long-lived (`7d`) opaque random token (`crypto.randomBytes(32).toString("hex")`) sent **exclusively in an `HttpOnly` cookie** (`parkease_refresh_token`, `Path=/api/auth`, `SameSite=Lax` in dev / `Strict` in prod, `Secure` in prod) and persisted in MongoDB (`RefreshToken` collection) **only as a SHA-256 hash** (`tokenHash`).
   - **Single Refresh Expiry Source:** Both the `HttpOnly` cookie `maxAge` and the MongoDB `RefreshToken.expiresAt` date use `getRefreshTokenTtlMs()` and `getRefreshTokenExpiryDate()` from `server/src/utils/cookies.js`.
   - **Refresh Token Rotation:** Every successful `POST /api/auth/refresh` revokes the used `RefreshToken` record, issues a new `RefreshToken` in the same `familyId`, sets the rotated `HttpOnly` cookie, and returns a new `accessToken` in JSON. Presenting an already-revoked token triggers reuse detection and revokes the entire `familyId` chain.
   - **Credentialed CORS & CSRF Protection:** `cors()` enables `credentials: true` for `CLIENT_URL`, and cookie-authenticated endpoints (`POST /api/auth/refresh`, `POST /api/auth/logout`) enforce `Origin` header matching and require `X-Requested-With: XMLHttpRequest`.
5. **Database-Backed Authentication Middleware (`authenticate`):**
   - The `authenticate` middleware must **not** rely exclusively on potentially stale `role` or `status` claims inside the access JWT. On every authenticated request, it must:
     1. Verify the access JWT (`verifyAccessToken(token)`).
     2. Extract the subject user ID (`decoded.sub`).
     3. Load the current user from MongoDB (`await User.findById(decoded.sub)`).
     4. Check the current database-backed account `status` and `role` (rejecting missing users with `401` and `SUSPENDED` or `REJECTED` accounts with `403`).
     5. Attach the current database-backed user identity (`req.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role, status: user.status }`) to `req.user`.
6. **Environment-Based Admin Bootstrap Script (`server/src/scripts/seedAdmin.js`):**
   - Provisions the initial `ADMIN` account idempotently and safely from environment variables without exposing any public admin creation endpoint.

---

## 2. Required Dependencies

Installed in `server/package.json`: `express`, `mongoose`, `cors`, `dotenv`, `bcryptjs`, `jsonwebtoken`.

```bash
npm install bcryptjs jsonwebtoken --workspace server
```

| Package | Workspace | Technical Justification |
| :--- | :--- | :--- |
| `bcryptjs` | `server` | Pure JavaScript implementation of `bcrypt` password hashing with zero native C++ node-gyp compilation issues across macOS/Linux/Windows and Node 22+. |
| `jsonwebtoken` | `server` | Industry-standard RFC 7519 JWT signing and verification (`HS256`) with built-in expiration (`exp`) and subject validation. |

---

## 3. Required Environment Variables & Local MongoDB Replica Set Setup

`server/.env.example`:

```dotenv
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/parkease?replicaSet=rs0
CLIENT_URL=http://localhost:5173
JWT_ACCESS_SECRET=replace-with-a-random-32-byte-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=10
ADMIN_NAME=ParkEase Admin
ADMIN_EMAIL=admin@parkease.local
ADMIN_PASSWORD=replace-with-a-strong-password
```

- **`JWT_ACCESS_SECRET`:** Must be at least 32 UTF-8 bytes and must not use a placeholder value.
- **No `JWT_REFRESH_SECRET`:** Refresh tokens are opaque random values, not signed JWTs.
- **Local Single-Node Replica Set Note (Required from Phase 1B):**
  Start local `mongod` with `--replSet rs0` and initialize it once via `mongosh --eval 'rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "127.0.0.1:27017" }] })'` (using `mongodb://127.0.0.1:27017/parkease?replicaSet=rs0` or a MongoDB Atlas URI).

---

## 4. Admin Bootstrap Script Specification (`server/src/scripts/seedAdmin.js` — Phase 1C)

Add `"seed:admin": "node src/scripts/seedAdmin.js"` to `server/package.json` scripts in Phase 1C. The script must adhere to these exact safety and operational rules:

1. **Required Environment Variables & Safe Failure:**
   - Requires `MONGODB_URI`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` (with optional `ADMIN_NAME`, defaulting to `"ParkEase Admin"`).
   - Validates that `ADMIN_EMAIL` is a valid email address and `ADMIN_PASSWORD` is at least 8 characters long.
   - If any required variable is missing or invalid, logs only the missing/invalid variable name(s) (e.g., `"Admin seed failed: ADMIN_EMAIL and ADMIN_PASSWORD (min 8 chars) are required."`) and exits with code `1` before attempting any database writes.
2. **Password Hashing:**
   - Hashes `ADMIN_PASSWORD` using `hashPassword(process.env.ADMIN_PASSWORD)` (`bcryptjs` with `BCRYPT_SALT_ROUNDS`, default `10`) and stores only `passwordHash`.
3. **Duplicate Admin Protection & Idempotent Execution:**
   - Checks the configured email for a conflicting account, then checks for an existing active Admin. Concurrent bootstrap attempts share a fixed identifier.
   - If an `ADMIN` user already exists with that email (or if an active `ADMIN` already exists), the script does **not** throw an error, does **not** create a duplicate record, and does **not** overwrite existing credentials — it prints `"Admin account already exists. Skipping seed."`, closes the Mongoose connection cleanly, and exits with code `0`.
   - If a non-admin user already owns `ADMIN_EMAIL`, it fails safely with code `1` (`"Cannot seed Admin: ADMIN_EMAIL is already registered to a non-admin account."`).
4. **No Credential Logging:**
   - Never prints `ADMIN_PASSWORD`, `passwordHash`, or `MONGODB_URI` to `stdout` or `stderr`.

---

## 5. File-by-File Implementation Checklist

### 5.1 Phase 1A — Backend Authentication Foundation (Completed)
- [x] `server/src/constants/statuses.js` — `USER_STATUS`, `MALL_STATUS`, `SLOT_STATUS`, `BOOKING_STATUS`, `BILLING_STATUS`, `QR_TOKEN_STATUS`.
- [x] `server/src/utils/AppError.js` — Operational error class (`status`, `message`, `code`, `details`, `isOperational = true`).
- [x] `server/src/middleware/errorHandler.js` — Formats operational `AppError` responses while preserving `400`, `413`, and `500` privacy behavior.
- [x] `server/src/utils/password.js` — `hashPassword(plain)` and `verifyPassword(plain, hash)` wrappers around `bcryptjs`.
- [x] `server/src/utils/jwt.js` — `signAccessToken(user)` (`HS256`, requires `>= 32`-byte `JWT_ACCESS_SECRET`), `verifyAccessToken(token)`, `generateRefreshToken()`, and `hashToken(rawToken)` (SHA-256).
- [x] `server/src/utils/cookies.js` — `REFRESH_COOKIE_NAME`, `getRefreshTokenTtlMs()`, `getRefreshTokenExpiryDate()`, `getRefreshCookieOptions()`, `setRefreshCookie(res, rawToken)`, `clearRefreshCookie(res)`, and `parseCookies(req)`.
- [x] `server/src/utils/validators.js` — `validateEmail`, `validatePassword`, `validateObjectId`, `requireFields`.
- [x] `server/src/models/User.js` — Mongoose schema & model for `User` with `passwordHash` hidden in queries and stripped in `toJSON` / `toObject`.
- [x] `server/src/models/RefreshToken.js` — Mongoose schema & model for `RefreshToken` enforcing 64-char SHA-256 hex `tokenHash`.
- [x] `server/test/auth-utils.test.js` — Unit and model validation tests.

### 5.2 Phase 1B — Authentication APIs (Completed)

- Register and log in with validated inputs and opaque refresh cookies.
- Rotate refresh sessions, detect reuse, and revoke sessions on logout.
- Load live database identity for `GET /api/auth/me`.
- Enable credentialed CORS, cookie endpoint CSRF protection, and auth rate limiting.
- Verify the endpoints and refresh session persistence with HTTP integration tests. Run with `AUTH_TEST_MONGODB_URI` set to an isolated replica set. Registration and refresh-family changes use transactions.

### 5.3 Phase 1C — RBAC and Admin (Completed)

- Add active-account, role, and approved-owner authorization middleware.
- Add the idempotent admin bootstrap script and owner-account approval routes.
- Verify role and status restrictions. Pending accounts can be activated or rejected. Active accounts can be suspended. Invalid transitions return `409 Conflict`. Rejection requires a reason. Mall ownership and guard assignment checks follow with their respective models.

### 5.4 Phase 1D — Frontend Authentication Integration

- Sign-in and registration forms support drivers and mall owners.
- The browser restores sessions via the HttpOnly refresh cookie and keeps the access token in memory. Requests share a refresh in progress and retry once after a 401.
- The dashboard requires sign-in and displays the live account status. An active Admin can list, approve, reject, and suspend mall-owner accounts.
- Use separate browser profiles to test Admin and owner sessions side by side. Tabs in one profile share the refresh cookie.

---

## 6. Milestone 1 API Endpoints Specification

| Method | Endpoint | Request Body / Headers | Success Response & Cookies | Error Cases |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Body: `{ name, email, password, phone?, role?: "USER" \| "MALL_OWNER" }` | `201 Created`: `{ success: true, message, data: { user, accessToken } }` + `Set-Cookie: parkease_refresh_token=<token>; HttpOnly; Path=/api/auth; SameSite=...` | `400` validation / invalid role (`ADMIN`, `GUARD`); `409` duplicate email |
| `POST` | `/api/auth/login` | Body: `{ email, password }` | `200 OK`: `{ success: true, message, data: { user, accessToken } }` + `Set-Cookie: parkease_refresh_token=<token>; HttpOnly; Path=/api/auth; SameSite=...` | `400` missing fields; `401` invalid credentials; `403` account `REJECTED` or `SUSPENDED` |
| `POST` | `/api/auth/refresh` | Cookie: `parkease_refresh_token`<br/>Header: `X-Requested-With: XMLHttpRequest` | `200 OK`: `{ success: true, message, data: { user, accessToken } }` + rotated `Set-Cookie: parkease_refresh_token=<newToken>; HttpOnly; ...` | `401` missing, expired, or reused/revoked cookie (clears cookie); `403` CSRF Origin/header failure |
| `POST` | `/api/auth/logout` | Cookie: `parkease_refresh_token`<br/>Header: `X-Requested-With: XMLHttpRequest` | `200 OK`: `{ success: true, message: "Logged out successfully" }` + cleared `Set-Cookie: parkease_refresh_token=; HttpOnly; Path=/api/auth; Expires=<past date>` | `403` CSRF Origin/header failure; `200` idempotent if cookie already absent |
| `GET` | `/api/auth/me` | Header: `Authorization: Bearer <accessToken>` | `200 OK`: `{ success: true, message, data: { user } }` (loaded live from MongoDB) | `401` missing/expired token or deleted user; `403` suspended or rejected account |
| `GET` | `/api/admin/mall-owners` | Header: `Authorization: Bearer <accessToken>`<br/>Query: `?status=PENDING_APPROVAL` | `200 OK`: `{ success: true, message, data: { mallOwners: [...] } }` | `401` unauthenticated; `403` non-Admin |
| `PATCH` | `/api/admin/mall-owners/:userId/status` | Header: `Authorization: Bearer <accessToken>`<br/>Body: `{ status: "ACTIVE" \| "REJECTED" \| "SUSPENDED", rejectionReason (required when rejecting) }` | `200 OK`: `{ success: true, message, data: { user } }` | `400` invalid status/id; `403` non-Admin; `404` owner not found; `409` invalid transition |

---

## 7. Milestone 1 Acceptance Criteria

- [ ] `npm run lint`, `npm run build`, and `npm test` pass with zero errors or warnings.
- [ ] `JWT_ACCESS_SECRET` requires at least 32 bytes and rejects missing or placeholder values.
- [ ] Access tokens are held only in React memory; refresh tokens are opaque random values sent only via `HttpOnly` cookies (`Path=/api/auth`) and stored only as SHA-256 hashes in MongoDB (`RefreshToken`), with cookie `maxAge` and `RefreshToken.expiresAt` using the same TTL helper.
- [ ] `authenticate` middleware loads the current user from MongoDB on every request and verifies live database `role` and `status` rather than trusting stale JWT claims.
- [ ] Credentialed CORS (`credentials: true`) and CSRF checks (`Origin` + `X-Requested-With`) protect `/api/auth/refresh` and `/api/auth/logout`.
- [ ] Passwords are never stored or logged in plaintext and `passwordHash` is never serialized in any API response.
- [ ] Public registration supports `USER` (auto-`ACTIVE`) and `MALL_OWNER` (`PENDING_APPROVAL`) and blocks `ADMIN` and `GUARD`.
- [x] Admin bootstrap script (`npm run seed:admin --workspace server`) provisions the `ADMIN` account idempotently with no credential logging.
