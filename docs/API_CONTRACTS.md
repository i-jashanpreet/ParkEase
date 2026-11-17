# ParkEase — API Architecture & Contracts (`docs/API_CONTRACTS.md`)

> **Document Status:** Milestone 0 Approved API Inventory & Contract Specification (Finalized)
> **Base Path:** `/api`
> **Content-Type:** `application/json` (Request body limit: `100kb`)

---

## 1. Global Request & Response Conventions

### 1.1 Standard Success Envelope
All successful API responses (`200 OK`, `201 Created`) follow a uniform JSON envelope that is backward-compatible with the existing `GET /api/health` endpoint (`{ "success": true, "message": "ParkEase API is running" }`):

```json
{
  "success": true,
  "message": "Human-readable summary of the action",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42
  }
}
```
- `success`: Always `true` for `2xx` responses.
- `message`: Always present (`String`).
- `data`: Optional object or array containing the resource payload.
- `meta`: Optional pagination or aggregation metadata on list endpoints.

### 1.2 Standard Error Envelope
All error responses (`4xx`, `5xx`) follow a uniform JSON envelope compatible with `server/src/middleware/errorHandler.js` and `server/src/middleware/notFound.js`:

```json
{
  "success": false,
  "message": "Clear, safe, human-readable error message",
  "error": {
    "code": "RESOURCE_CONFLICT",
    "details": [
      { "field": "email", "issue": "Email address is already registered" }
    ]
  }
}
```
- `success`: Always `false` for `4xx` and `5xx` responses.
- `message`: Top-level error summary (preserves existing test assertions on `body.message`).
- `error`: Optional structured metadata (`code` string and optional `details` array for field validation errors). Never contains stack traces, database URIs, or internal secrets.

### 1.3 HTTP Status Code Standards
| Status Code | Meaning | When Used in ParkEase |
| :--- | :--- | :--- |
| `200 OK` | Request succeeded | Standard reads (`GET`), updates (`PATCH`), state transitions (login, refresh, logout, approve, cancel, entry, exit). |
| `201 Created` | Resource created | Registration, creating a mall, creating slots, provisioning a guard, creating a booking. |
| `400 Bad Request` | Validation / Malformed input | Malformed JSON body, missing required fields, invalid ObjectId format, invalid enum value, attempting to self-assign `ADMIN`/`GUARD` on public register. |
| `401 Unauthorized` | Unauthenticated | Missing `Authorization` header, expired/invalid JWT access token, deleted user account, invalid email/password on login, missing/expired/revoked/reused `HttpOnly` refresh token cookie. |
| `403 Forbidden` | Unauthorized role, scope, or CSRF rejection | Authenticated user lacks required role (`ROLES`), user account is `SUSPENDED`/`REJECTED` or `MALL_OWNER` is `PENDING_APPROVAL`, owner accessing another owner's mall, `GUARD` operating on an unassigned mall, or failed CSRF `Origin` / `X-Requested-With` check on cookie endpoints. |
| `404 Not Found` | Resource / Route missing | Unknown API path (`notFound.js`), or valid ObjectId whose document does not exist. |
| `409 Conflict` | Business rule / State conflict | Duplicate email, duplicate slot number in a mall, user already has an active booking, no available slots (`AVAILABLE -> RESERVED` race lost), invalid state transition (e.g., cancelling an `ACTIVE` booking, replaying a QR token). |
| `413 Payload Too Large` | Body exceeds `100kb` | Handled automatically by `express.json({ limit: "100kb" })` and `errorHandler.js`. |
| `429 Too Many Requests` | Rate limit exceeded | Too many login/register/refresh attempts from the same IP. |
| `500 Internal Server Error` | Unexpected server failure | Unhandled runtime error; always returns `{ "success": false, "message": "Something went wrong" }`. |

---

## 2. Authentication, Cookie & CSRF Architecture

### 2.1 Access Token vs. Refresh Token Transport
1. **Access Token (Short-Lived JWT in React Memory):**
   - Lifetime: `15m` (`JWT_ACCESS_EXPIRES_IN`).
   - Signed with `HS256` using a `>= 32`-byte `JWT_ACCESS_SECRET`.
   - Returned in the JSON response payload (`data.accessToken`) of `POST /api/auth/register`, `POST /api/auth/login`, and `POST /api/auth/refresh`.
   - Held **only in React memory** (`AuthContext` / module variable in `client/src/services/api.js`), never written to `localStorage` or `sessionStorage`.
   - Sent by the client in the HTTP header:
     ```http
     Authorization: Bearer <accessToken>
     ```
   - Payload claims: `{ sub: userId, role: user.role, status: user.status, iat, exp }`.
2. **Refresh Token (`HttpOnly` Cookie, Opaque Random Token Hashed in MongoDB):**
   - Lifetime: `7d` (`JWT_REFRESH_EXPIRES_IN`), shared consistently between cookie `maxAge` and MongoDB `RefreshToken.expiresAt` via `getRefreshTokenTtlMs()` / `getRefreshTokenExpiryDate()` in `server/src/utils/cookies.js`.
   - Generated as 32 cryptographically random bytes (`crypto.randomBytes(32).toString("hex")`).
   - **Never returned in any JSON response body** and never accessible to `document.cookie` or `localStorage`.
   - Stored in MongoDB (`RefreshToken` collection) **exclusively as a SHA-256 hex digest** (`tokenHash`).
   - Set and cleared by the server via the `Set-Cookie` header under the cookie name `parkease_refresh_token`:
     - **Local Development (`NODE_ENV !== "production"`):**
       - `HttpOnly: true`
       - `Secure: false` (allows `http://localhost:5173` <-> `http://localhost:5000` over HTTP)
       - `SameSite: "lax"`
       - `Path: "/api/auth"` (cookie is only sent on requests to `/api/auth/*`)
       - `Max-Age: 604800` (7 days in seconds)
     - **Production (`NODE_ENV === "production"`):**
       - `HttpOnly: true`
       - `Secure: true` (HTTPS required)
       - `SameSite: "strict"` when frontend and backend are same-site (if deployed cross-site on separate domains, adjust to `SameSite: "none"` with `Secure: true`)
       - `Path: "/api/auth"`
       - `Max-Age: 604800`

### 2.2 Credentialed CORS & CSRF Protection on `/api/auth/refresh` and `/api/auth/logout`
- **Credentialed CORS (`server/src/app.js`):**
  ```js
  app.use(
    cors({
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    })
  );
  ```
- **CSRF Defense-in-Depth (`POST /api/auth/refresh` & `POST /api/auth/logout`):**
  1. **Cookie Scoping:** `Path=/api/auth` ensures the refresh cookie is never sent to business endpoints (`/api/bookings`, `/api/malls`, `/api/admin`, etc.), which authenticate exclusively via `Authorization: Bearer <accessToken>`.
  2. **Origin Verification:** Middleware on `/api/auth/refresh` and `/api/auth/logout` requires an `Origin` header that matches `process.env.CLIENT_URL || "http://localhost:5173"`; mismatches are rejected with `403 Forbidden`.
  3. **Custom Header Requirement:** `/api/auth/refresh` and `/api/auth/logout` require `X-Requested-With: XMLHttpRequest` (automatically attached by `client/src/services/api.js`), preventing simple cross-origin HTML `<form>` CSRF attacks.

### 2.3 Database-Backed Authorization Middleware Tiers
1. `authenticate`:
   - Verifies the `Bearer` JWT access token (`verifyAccessToken(token)`).
   - Extracts the subject user ID (`decoded.sub`).
   - Loads the current user document from MongoDB (`await User.findById(decoded.sub)`).
   - Checks the current database-backed account `status` and `role` (does not rely exclusively on potentially stale `role`/`status` claims in the access token).
   - Attaches the live database user identity (`req.user = { id, name, email, role, status }`) to `req`. Returns `401` if token/user is invalid or missing, or `403` if the account is `SUSPENDED` or `REJECTED`.
2. `requireActiveAccount`: Verifies `req.user.status === "ACTIVE"`. Returns `403` if `PENDING_APPROVAL` (note: `GET /api/auth/me` and `POST /api/auth/logout` allow `PENDING_APPROVAL` owners so they can view their onboarding status and sign out).
3. `authorize(...allowedRoles)`: Verifies `allowedRoles.includes(req.user.role)`. Returns `403` if role is not permitted.
4. `requireMallOwnership` / `requireGuardMallAccess`: Verifies resource-level ownership (`Mall.ownerId === req.user.id`) or active guard assignment (`GuardAssignment.exists({ guardId: req.user.id, mallId, isActive: true })`).

---

## 3. Complete Proposed API Route Inventory

### 3.0 System Health (Implemented)
| Method | Route | Auth Required | Required Role | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | No | Public | Liveness check returning `{ success: true, message: "ParkEase API is running" }`. |

---

### 3.1 Authentication (`/api/auth`)
| Method | Route | Auth Required | Required Role | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | No | Public | Register a new `USER` (`status: "ACTIVE"`) or `MALL_OWNER` (`status: "PENDING_APPROVAL"`). Rejects `GUARD` and `ADMIN` self-registration. Sets `HttpOnly` refresh cookie (`parkease_refresh_token`) and returns `{ user, accessToken }` in JSON. |
| `POST` | `/api/auth/login` | No | Public | Authenticate with `email` and `password`. Rejects `REJECTED` or `SUSPENDED` accounts (`403`). Sets `HttpOnly` refresh cookie and returns `{ user, accessToken }` in JSON. |
| `POST` | `/api/auth/refresh` | Yes *(`HttpOnly` cookie + CSRF header)* | Public | Reads `parkease_refresh_token` cookie, verifies SHA-256 hash in `RefreshToken`, performs rotation (revokes old token, sets new `HttpOnly` refresh cookie), and returns `{ accessToken, user }` in JSON. If reuse of a revoked token is detected, revokes the entire `familyId` chain, clears cookie, and returns `401`. |
| `POST` | `/api/auth/logout` | Yes *(`HttpOnly` cookie + CSRF header)* | Any (`USER`, `MALL_OWNER`, `GUARD`, `ADMIN`) | Revokes the refresh token family in MongoDB when a recognized, unexpired cookie is present and clears the `parkease_refresh_token` `HttpOnly` cookie. Idempotent (`200 OK`). |
| `GET` | `/api/auth/me` | Yes *(Bearer JWT)* | Any (`USER`, `MALL_OWNER`, `GUARD`, `ADMIN`) | Return current authenticated user's database-backed profile, role, and live account `status` (including `PENDING_APPROVAL` for unapproved Mall Owners). |

---

### 3.2 Users (`/api/users`)
| Method | Route | Auth Required | Required Role | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/users/profile` | Yes | Any (`USER`, `MALL_OWNER`, `GUARD`, `ADMIN`) | Retrieve detailed user profile (plus assigned mall info if `GUARD`). |
| `PATCH` | `/api/users/profile` | Yes | Any (`USER`, `MALL_OWNER`, `GUARD`, `ADMIN`) | Update mutable profile fields (`name`, `phone`). Cannot modify `role`, `status`, or `email`. |
| `PATCH` | `/api/users/password` | Yes | Any (`USER`, `MALL_OWNER`, `GUARD`, `ADMIN`) | Change password (requires `currentPassword` and `newPassword`; revokes existing refresh tokens). |

---

### 3.3 Mall Management (`/api/malls`)
| Method | Route | Auth Required | Required Role | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/malls` | No | Public | List publicly discoverable malls (`Mall.status === "APPROVED"`), with optional case-insensitive `city` and literal `search` filters. Returns `data.malls` and `data.total`. |
| `GET` | `/api/malls/:mallId` | No | Public | Return public profile fields in `data.mall`. Pending, rejected, inactive, and missing malls return `404`. Slot availability is a separate endpoint. |
| `POST` | `/api/malls` | Yes | `MALL_OWNER` *(Account `ACTIVE`)* | Submit a mall with `name`, `city`, `address`, and integer `hourlyRatePaise`. Optional fields are `description`, `openingTime`, and `closingTime`. The API sets the owner and `PENDING` status and returns `201` with `data.mall`. An exact duplicate name, city, and address returns `409`. |
| `GET` | `/api/malls/owner/my-malls` | Yes | `MALL_OWNER` *(Account `ACTIVE`)* | Return `data.malls` for the authenticated owner. List all malls owned by the authenticated `MALL_OWNER` (includes `PENDING`, `APPROVED`, `REJECTED`, `INACTIVE`). |
| `GET` | `/api/malls/owner/:mallId` | Yes | `MALL_OWNER` *(Owner of mall)* | Get full management details for an owner's specific mall, including approval metadata. |
| `PATCH` | `/api/malls/:mallId` | Yes | `MALL_OWNER` *(Owner of mall)* | Update mall details (`name`, `description`, `hourlyRate`, `openingTime`, `closingTime`, or resubmit a `REJECTED` mall). |

---

### 3.4 Parking Slots (`/api/malls/:mallId/slots` & `/api/slots`)
| Method | Route | Auth Required | Required Role | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/malls/:mallId/slots/availability` | No | Public | Get real-time availability breakdown (`AVAILABLE`, `RESERVED`, `OCCUPIED` counts by `vehicleType` and floor) for an `APPROVED` mall. |
| `GET` | `/api/malls/:mallId/slots` | Yes | `MALL_OWNER` *(Owner)*, `GUARD` *(Assigned)*, `ADMIN` | List all slots in the specified mall with filtering by `floor`, `status`, `vehicleType`, and `isActive`. |
| `POST` | `/api/malls/:mallId/slots` | Yes | `MALL_OWNER` *(Owner, Account `ACTIVE`)* | Create a single parking slot or batch of slots in the owner's mall. Enforces `{ mallId, slotNumber }` uniqueness (`409` on duplicate). |
| `PATCH` | `/api/slots/:slotId` | Yes | `MALL_OWNER` *(Owner of parent mall)* | Update slot metadata (`floor`, `zone`, `vehicleType`, or toggle `MAINTENANCE` when slot is `AVAILABLE`). |
| `PATCH` | `/api/slots/:slotId/deactivate` | Yes | `MALL_OWNER` *(Owner of parent mall)* | Soft-deactivate (`isActive: false`) or reactivate (`isActive: true`) a parking slot. Rejects deactivation with `409` if slot is currently `RESERVED` or `OCCUPIED`. |

---

### 3.5 Guard Management (`/api/guards`)
| Method | Route | Auth Required | Required Role | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/malls/:mallId/guards` | Yes | `MALL_OWNER` *(Owner of mall, Account `ACTIVE`)*, `ADMIN` | Provision a new `GUARD` user account and create an active `GuardAssignment` linking the guard to `:mallId`. |
| `GET` | `/api/malls/:mallId/guards` | Yes | `MALL_OWNER` *(Owner of mall)*, `ADMIN` | List all guards and their `GuardAssignment` status (`isActive`, `gateLabel`) for `:mallId`. |
| `PATCH` | `/api/guards/assignments/:assignmentId` | Yes | `MALL_OWNER` *(Owner of mall)*, `ADMIN` | Update `gateLabel` or activate/deactivate (`isActive: true/false`) a guard's assignment to a mall. |
| `GET` | `/api/guards/my-assignment` | Yes | `GUARD` | Retrieve the authenticated guard's active `GuardAssignment` and assigned `Mall` details. |

---

### 3.6 Bookings (`/api/bookings`)
| Method | Route | Auth Required | Required Role | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/bookings` | Yes | `USER` | Within a Mongoose transaction (`session.withTransaction()`), conditionally reserves an `AVAILABLE` slot at an `APPROVED` mall, enforces one active booking per user and per slot via partial unique indexes, creates a `CONFIRMED` booking with `expiresAt`, and issues a `QRToken`. Returns `409` if no slot is available or user already has an active booking. |
| `GET` | `/api/bookings/my` | Yes | `USER` | List the authenticated user's booking history (paginated, filterable by `status`). |
| `GET` | `/api/bookings/my/active` | Yes | `USER` | Retrieve the user's current active booking (`CONFIRMED` or `ACTIVE`) along with slot, mall, and QR token display data. |
| `GET` | `/api/bookings/:bookingId` | Yes | `USER` *(Owner)*, `MALL_OWNER` *(Mall owner)*, `GUARD` *(Assigned to mall)*, `ADMIN` | Retrieve detailed booking record (scoped strictly to the caller's ownership/assignment). |
| `POST` | `/api/bookings/:bookingId/cancel` | Yes | `USER` *(Booking owner)* | Within a Mongoose transaction, cancels an eligible `CONFIRMED` booking before entry, transitions booking to `CANCELLED`, revokes `QRToken`, and releases `ParkingSlot` (`RESERVED -> AVAILABLE`). Returns `409` if booking is already `ACTIVE`, `COMPLETED`, `CANCELLED`, or `EXPIRED`. |
| `GET` | `/api/malls/:mallId/bookings` | Yes | `MALL_OWNER` *(Owner of mall)*, `ADMIN` | List bookings for a specific mall with status and date filters. |

---

### 3.7 QR Operations (`/api/qr`)
| Method | Route | Auth Required | Required Role | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/bookings/:bookingId/qr` | Yes | `USER` *(Booking owner)* | Retrieve the active QR payload/token string for a `CONFIRMED` or `ACTIVE` booking so the frontend can render the QR code. |
| `POST` | `/api/qr/verify` | Yes | `GUARD` *(Assigned to booking's mall)* | Dry-run verification of a scanned QR token at the gate. Validates token hash, checks guard's `GuardAssignment` for the booking's `mallId`, and returns booking details, vehicle number, slot number, and allowed next action (`ENTRY` if `CONFIRMED`, `EXIT` if `ACTIVE`). |

---

### 3.8 Gate Entry and Exit Operations (`/api/operations`)
| Method | Route | Auth Required | Required Role | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/operations/entry` | Yes | `GUARD` *(Assigned to booking's mall)* | Process vehicle gate entry using scanned QR token inside a Mongoose transaction. Requires `Booking.status === "CONFIRMED"` and not expired. Records server `entryTime`, transitions `Booking -> ACTIVE`, transitions `ParkingSlot -> OCCUPIED`, and marks `QRToken.entryScannedAt`. |
| `POST` | `/api/operations/exit` | Yes | `GUARD` *(Assigned to booking's mall)* | Process vehicle gate exit using scanned QR token inside a Mongoose transaction. Requires `Booking.status === "ACTIVE"`. Records server `exitTime`, calculates duration and bill, transitions `Booking -> COMPLETED`, marks `QRToken -> CONSUMED`, and releases `ParkingSlot -> AVAILABLE`. |
| `GET` | `/api/operations/recent` | Yes | `GUARD` *(Assigned to mall)* | List recent gate entry and exit scans processed at the guard's assigned mall. |

---

### 3.9 Billing (`/api/billing`)
> **Provisional Billing Policy Note:** The MVP defaults to a minimum 1-hour charge and ceiling-based partial-hour rounding (`billableHours = Math.max(1, Math.ceil(durationMinutes / 60))`, `calculatedAmount = billableHours * hourlyRateSnapshot`). This policy is marked as a **provisional product decision** to be explicitly confirmed prior to Milestone 4 implementation.

| Method | Route | Auth Required | Required Role | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/bookings/:bookingId/bill` | Yes | `USER` *(Booking owner)*, `MALL_OWNER` *(Mall owner)*, `GUARD` *(Assigned)*, `ADMIN` | Retrieve the itemized parking bill/receipt for a completed booking (`entryTime`, `exitTime`, `durationMinutes`, `billableHours`, `hourlyRateSnapshot`, `calculatedAmount`, `billingStatus`). |
| `GET` | `/api/billing/my-history` | Yes | `USER` | List all generated bills/receipts for the authenticated user's completed bookings. |

---

### 3.10 Analytics (`/api/analytics`)
| Method | Route | Auth Required | Required Role | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/analytics/owner/overview` | Yes | `MALL_OWNER` *(Account `ACTIVE`)* | Aggregated metrics across the authenticated owner's malls: total slots, current occupancy (`AVAILABLE`, `RESERVED`, `OCCUPIED`), active bookings, completed bookings, and total generated revenue. |
| `GET` | `/api/analytics/owner/malls/:mallId` | Yes | `MALL_OWNER` *(Owner of mall)*, `ADMIN` | Detailed occupancy, booking status distribution, and revenue breakdown for a single mall. |
| `GET` | `/api/analytics/admin/overview` | Yes | `ADMIN` | Platform-wide metrics: total users by role, pending/approved mall owners, pending/approved malls, total active bookings, platform occupancy, and total billed revenue across all malls. |

---

### 3.11 Admin Operations (`/api/admin`)
| Method | Route | Auth Required | Required Role | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/mall-owners` | Yes | `ADMIN` | List `MALL_OWNER` accounts filtered by `status` (`PENDING_APPROVAL`, `ACTIVE`, `REJECTED`, `SUSPENDED`). |
| `PATCH` | `/api/admin/mall-owners/:userId/status` | Yes | `ADMIN` | Approve (`status: "ACTIVE"`), reject (`status: "REJECTED"` with `rejectionReason`), a pending `MALL_OWNER` account, or suspend (`status: "SUSPENDED"`) an active owner. Returns `409` for invalid transitions. |
| `GET` | `/api/admin/malls` | Yes | `ADMIN` | List all submitted malls filtered by `status` (`PENDING`, `APPROVED`, `REJECTED`, `INACTIVE`). |
| `PATCH` | `/api/admin/malls/:mallId/status` | Yes | `ADMIN` | Approve (`status: "APPROVED"`), reject (`status: "REJECTED"` with `rejectionReason`) a pending mall, or deactivate (`status: "INACTIVE"`) an approved mall. Invalid transitions return `409`. |
| `POST` | `/api/admin/guards` | Yes | `ADMIN` | Admin endpoint to provision a `GUARD` account and assign them to any `Mall`. |
