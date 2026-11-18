# Mehak — Backend completion handoff

## Assignment and expected result

Own the remaining server implementation for the ParkEase v1 MVP. Deliver a transaction-safe parking visit from reservation through QR entry, actual-time billing and exit, plus guard management, analytics and account/profile support. Ocean owns the browser interfaces and final release integration.

This document is an implementation brief for you or an agent you delegate to. Read the shared contract later in this file before editing. Proposed endpoint shapes and policy defaults are deliberate handoff decisions, not existing implemented behavior. Preserve the working scheduled-reservation model.

## Start here

1. Inspect Git status and the integration prerequisite in the shared baseline. Start on a clean feature branch containing the current reservation implementation.
2. Read these actual files before relying on older architecture notes:
   - `server/src/routes/authRoutes.js`, `services/authService.js`, `middleware/authenticate.js`, `middleware/authorize.js`.
   - `server/src/models/{User,RefreshToken,Mall,Booking}.js`.
   - `server/src/routes/{mallRoutes,inventoryRoutes,bookingRoutes,adminRoutes,index}.js`.
   - `server/src/utils/{bookingWindow,jwt,cookies,password,validators,AppError}.js`.
   - `server/src/config/db.js`, `constants/statuses.js`, `test/auth.test.js`.
3. Record current test results before changes. The current DB initialization explicitly initializes User, RefreshToken and Mall, and needs Booking plus new model/index readiness before production requests.
4. Send Ocean an additive DTO fixture for each new endpoint before its implementation is complete. Commit fixtures only under a clearly named test/demo area.
5. Keep server changes reviewable in the batches below. New domain rules belong in focused services/controllers; a wholesale rewrite of existing routes is unnecessary.

## M1. Shared model, migration and reservation reliability

### Models and identifiers

Keep `Booking.driverId`, `mallId`, `bayId`, `slotCode`, `floor`, `startTime`, `endTime`, `hourlyRatePaise`, `totalAmountPaise`, `vehicleNumber`, `vehicleType`. Booking/mall/user IDs are ObjectIds; bay IDs are stable UUID strings from the embedded published layout. The currently working inventory is `Mall.parkingDraft` and `Mall.parkingPublished`, not a ParkingSlot collection. Extend this design and derive runtime occupancy from bookings. A migration to a separate slot model needs a coordinated migration and is outside the default assignment.

Extend Booking with:

- Persisted statuses CONFIRMED, ACTIVE, COMPLETED, CANCELLED, EXPIRED.
- `entryDeadline`, `entryTime`, `exitTime`, `enteredBy`, `exitedBy`, `expiredAt`.
- Billing data/snapshot fields needed for the shared bill DTO. Keep the reservation estimate immutable.
- `billingStatus` PENDING/GENERATED/WAIVED with a separate final calculated amount in paise.
- A serializer/service shared by list, detail, QR eligibility and operation responses.
- `canCancel`, `qrEligiblePurposes` and `billAvailable` computed server-side, never accepted from a client.

New models:

| Model | Fields and indexes |
| --- | --- |
| GuardAssignment | guardId, mallId, assignedBy, gateLabel, isActive, createdAt, updatedAt. Unique pair guardId+mallId; indexed guardId+isActive and mallId+isActive. |
| QRToken | bookingId, purpose ENTRY/EXIT, tokenHash SHA-256, status ACTIVE/CONSUMED/REVOKED/EXPIRED, expiresAt, consumedAt, createdAt. Unique tokenHash; enforce one current credential per booking+purpose transactionally and, where supported, with a partial unique index. |
| GateOperation | operationId UUID, guardId, assignmentId, mallId, bookingId, bayId, action, occurredAt, safe result snapshot, request fingerprint made from token hash + mallId + action. Unique guardId+operationId for exact retries. Do not store raw QR tokens. |

One ACTIVE visit per driver and one ACTIVE visit per mallId+bayId must be enforced with appropriate partial unique indexes. Confirm MongoDB version support before using partial filter expressions. Past/future CONFIRMED windows stay governed by overlap queries, not an all-time unique index.

### Migration and readiness

Create a repeatable, documented migration script with dry-run output and counts. Backfill entryDeadline for eligible old CONFIRMED records. Convert old unentered elapsed bookings to EXPIRED and WAIVED. Preserve legitimate cancellations and snapshots. Never fabricate actual entry/exit times or historical completed revenue. Report inconsistent records for review instead of deleting them.

Initialize new collections/indexes before transactions. Add Booking, GuardAssignment, QRToken and GateOperation initialization to DB startup. Check for duplicate ACTIVE rows before creating unique indexes. Migration errors must prevent an apparently successful release. Keep the MongoDB replica-set requirement explicit.

### Preserve and strengthen concurrency

Current create takes a write on Mall via `bookingSequence` and then checks overlaps in the same transaction. Preserve that serialization until replaced by an equally tested design. For multi-document operations, use a consistent lock/write order (for example User, Mall, Booking, credential, operation) across callers to reduce retry issues.

- Update overlap queries and inventory guards to include ACTIVE occupancy after scheduled end.
- Reject creating a future reservation on a currently ACTIVE bay until exit, per the shared default.
- During entry, lock the driver as well as the mall/booking so simultaneous entry on different malls cannot create two ACTIVE visits.
- Make cancellation transactional with QR revocation. Race it against entry, expiration and reissue.
- Check booking time and guard assignment validity again inside the transaction after retries.
- Make assignment deactivation and guard suspension serialize with gate writes using a shared guard/assignment write or revision strategy; a stale pre-transaction check alone is insufficient.
- Before changing mall approval status to INACTIVE, enforce outstanding reservation/visit restrictions in `adminRoutes.js`; handle a race with booking creation.
- Owner publication/deactivation/metadata changes must not strand future reservations or ACTIVE visits. Keep stable bay IDs across edits and fail destructive changes with 409.
- Add client-retry protection for booking creation. Accept optional `Idempotency-Key` UUID, unique per driver, with a request fingerprint and original reservation response. Same key plus a different body returns 409. If added, document it for Ocean.
- Match cancellation's existing retry behavior. No retry may duplicate an operation, bill or reservation.

**M1 acceptance:** old fixtures migrate, current reservation tests pass, scheduled adjacent bookings still work, and active occupancy cannot be released by a clock timeout.

## M2. Guard accounts and assignments

Implement the shared guard endpoints with server-derived identity.

- Owners can provision/assign only for their own approved malls. Admin can provision/assign across malls.
- Reuse bcrypt/password validation and User role/status. Never publicly register a GUARD role.
- Never convert an existing driver/owner account to GUARD when an email collides. Return a clear 409.
- Whitelist guard fields. Return sanitized User DTOs, never password hashes.
- Existing guard assignment can be reactivated by its authorized operator. Duplicate creation must not create parallel active assignments.
- Add `mustChangePassword` to temporary-credential guard accounts. Login works for credential change, but gate routes reject until changed.
- Password change must clear the guard's temporary flag and revoke refresh families. Ocean then redirects to fresh login.
- Server enforces active guard, active assignment and matching booking mall on preview, entry, exit and recent activity.
- A guard may have multiple active assignments. The selected mall is explicit in the request and is never trusted without validation.
- Current UI/hand-off must communicate temporary credentials manually. No secret printed in logs, reusable test fixtures or response DTOs.
- Profile endpoints can be added in this batch. Reject role/status/email/ownerId updates through profile patch.

**M2 acceptance:** own-mall provisioning succeeds; wrong owner, driver and unassigned/suspended guard fail; first-login password change is required; disabling assignment removes gate access immediately.

## M3. Secure QR credentials and operation previews

Implement `POST /bookings/:id/qr` and `POST /qr/verify`.

- QR payload is an opaque random token (at least 32 cryptographic random bytes). Persist only its hash.
- Persist purpose, expiry and status. Read-only verification returns minimal operational data to an assigned guard.
- ENTRY eligible only for a live CONFIRMED booking within the configured entry window. EXIT eligible only for ACTIVE.
- POST credential issue rotates a purpose's active credential. Do not put raw tokens on GET URLs, query strings, analytics, logs or ordinary booking list/detail responses.
- Cancelled, expired, completed or inaccessible bookings cannot mint a credential.
- Rate-limit credential issuance and invalid scan attempts. Ocean renders raw token in memory only and clears it on logout/navigation.
- Verify preview does not consume a credential or reserve a state transition. `allowed=false` includes a stable reasonCode such as TOO_EARLY, ENTRY_DEADLINE_PASSED, WRONG_MALL, TOKEN_EXPIRED, TOKEN_USED or WRONG_BOOKING_STATE.
- Malformed tokens get 400; inaccessible resources stay 404/403 without exposing credentials or unrelated booking identity.
- The final entry/exit operation must repeat every validation; never trust a prior preview result.

**M3 acceptance:** correct owner gets an expiring credential, old rotated/revoked token fails, wrong mall fails, preview produces no writes, and refresh/reissue supports a reload without storing raw credentials.

## M4. Atomic entry, exit, final billing and expiry worker

Implement the operation endpoints and bill details using shared policy defaults.

### Entry

Within one retriable transaction, validate identity/assignment, token and timing, claim the booking conditionally, enforce one ACTIVE visit per driver/bay, record server entry time, consume ENTRY credential and insert GateOperation. Repeated same-operationId requests return the stored original result. A different operationId reusing consumed QR receives 409. Same operationId with a different fingerprint also receives 409.

### Exit and bills

Within one transaction, claim ACTIVE booking, verify EXIT credential and assigned guard, record server exit time, compute integer paise using the original rate snapshot, generate the final immutable bill, consume EXIT credential and insert GateOperation. Keep exactly one final bill per booking, whether embedded or separately persisted. Availability derives from the committed lifecycle.

Bill lookup permits only booking owner, owning mall owner, assigned guard or admin. A future/current reservation estimate is not a final bill. Never accept authoritative entry/exit times, guardId or amounts from a request. Test at least 1 minute, exactly 60 minutes, 61 minutes, zero-priced parking, changed current rate, midnight and an overstay past scheduled departure.

### Worker

Add an expiry service and a separately callable runner. Start/stop an interval with the server lifecycle, avoid overlapping runs within a process, and use conditional transactions so multiple instances are safe. Do not use a TTL index to delete reservation history. On EXPIRED, revoke credentials, write expiredAt and waive billing. Check stale status on availability/read/write paths as well.

Expose a safe worker/readiness signal and document restart behavior. Sweep failures are logged without secrets and retried on the next run; one failing record must not stop processing the entire batch.

**M4 acceptance:** concurrent entry/exit/replay produces one event and bill, expiry never clears an ACTIVE visit, and scheduled future reservations remain separate from actual occupancy.

## M5. Owner/admin analytics, profile changes and mall management

Implement the exact analytics DTO and date semantics in the shared contract. Scope owners through `req.user._id`; ignore a supplied ownerId. Aggregate billed amount from finalized non-duplicated bills and completed visits only. Return zero metrics and empty arrays for genuine empty data. Current draft capacity does not contribute.

Implement protected mall booking/operation lists with deterministic cursor pagination and the shared maximum limit. Apply safe search/status/date filters and indexes. Business profile updates use the existing validation/rate-in-paise conventions. Changing current hourly rate affects new reservations only. If address/name edits are supported, require re-review for those identity changes, reject them while there are outstanding visits/reservations, and return the new approval status. Existing booking snapshots stay intact.

Profile patch permits name/phone. Password change verifies current credentials, validates new password, revokes refresh families and forces login. Sensitive mutations should have per-account/IP throttling. Email verification, transactional email delivery and recovery links require a separately configured delivery provider; list password-reset delivery as an optional follow-on unless explicitly required by the PRD.

**M5 acceptance:** scoped analytics, half-open booking windows, consistent IST reporting, immutable historical snapshots, and no monetary floats in storage.

## M6. Security, test coverage and backend release readiness

Inspect and improve within these implemented flows:

- Input validation for IDs, duplicate query values, unexpected types, limit bounds and excessive body size.
- Explicit request-field whitelists and resource authorization on every new endpoint.
- Existing refresh-cookie Origin plus X-Requested-With checks remain intact.
- Rate limiting for auth and operation abuse; avoid treating a shared school network as one account.
- Readiness verifies transaction-capable MongoDB and required indexes. Liveness remains separately cheap.
- Graceful shutdown of HTTP listener, DB and expiry timer; safe request/worker error logs.
- Health/deployment documentation includes MongoDB replica set/Atlas, TLS, cookies and configured browser origin.
- Helpers should permit deterministic clock testing; no test waits for real expiry.
- Add focused service tests and isolated DB integration tests. Do not put every new domain test into the growing auth test file.

Required test matrix:

| Area | Cases |
| --- | --- |
| Reservation compatibility | Existing overlap race, adjacent windows, cancellation, publication protection; retry same key and different-body key. |
| Assignment authorization | Wrong owner/mall/role, inactive assignment, suspended guard, mutation races with gate entry. |
| QR | Correct owner, malformed/random/reused/rotated/expired token, wrong purpose, no raw hash/token leakage. |
| Entry | Before start, at start, at exclusive deadline, two guards same bay, two malls same driver, cancelled/expired booking. |
| Exit | Before entry, after scheduled end, concurrent exit, duplicate operationId, different-body retry, exactly one final bill. |
| Inventory | Active bay cannot be removed/renamed/maintained, past reservation history retained, runtime occupancy dominates availability. |
| Billing | Rounding boundaries, original rate snapshot, free rate, zero/invalid duration safeguards, IST date bounds. |
| Expiry | Multiple workers, restart, batch failure, cancellation race, reissue race, ACTIVE never expires. |
| Read privacy | Driver sees own, owner sees owned malls, guard sees assigned, admin sees all; unauthenticated denied. |
| Migration | Repeat dry run, repeat apply, old ENDED serialization reconciliation, inconsistent record report, index setup. |

Run database-backed tests on an isolated replica set. A skipped integration suite must be called out rather than reported as successful.

## Mehak's delivery batches and coordination

1. **Backend foundations PR** — DTO serializer, additive model fields, indexes/migration, lifecycle policy helpers and QR/assignment API fixtures.
2. **Guard/QR PR** — provisioning, assignments, first-login credentials, credential issue and preview.
3. **Operations PR** — entry, exit, expiry, final bills and concurrency tests.
4. **Reporting/hardening PR** — analytics/profile/mall APIs, readiness, security, migration/operations instructions.

For every batch supply Ocean endpoint examples, error-code list, model migration requirements and fixture data. Ocean can build services/screens against the shared contract while waiting. Any breaking endpoint/enum change needs a paired contract update before either implementation diverges.

Backend completion checklist:

- [ ] All shared backend routes exist with authorization and validation.
- [ ] Credentials, role checks and temporary guard setup tested.
- [ ] Gate operations, expiry, billing and reservation/inventory concurrency tested.
- [ ] Existing scheduled reservation flows remain usable.
- [ ] Migrations are rerunnable with safe dry-run output.
- [ ] Readiness and worker startup/shutdown documented.
- [ ] Analytics use server bills and explicit date semantics.
- [ ] API docs describe actual current routes and DTOs.
- [ ] Unit/integration tests, lint and build results reported truthfully.
- [ ] Ocean can run the shared completion scenario against real APIs.
- [ ] Product-policy defaults listed for owner review before release.

## Agent execution instruction

Read this entire file and `docs/OCEAN_REMAINING_WORK.md`'s ownership section. Audit the current checkout. Implement the Mehak batches through their normal API entry points, preserve teammates' changes, reuse existing auth/session/validation logic and retain scheduled booking semantics. Complete server changes and tests, migrations and operational instructions. Report files changed, actual checks, DTO deviations and policy decisions still awaiting release approval. Ask for missing material information only when it blocks a concrete dependency.

## Shared project baseline and contract

This section is identical in both assignments. Date of audit: 18 November 2026.

### Source of truth and scope

The working tree at audit contains reservation commit `0fe3223` and a resolved, staged merge from `3281b3f`. These documents assign the remaining **v1 MVP**, based on the code and the recorded project decisions. The original PDF PRD's temporary attachment path is unavailable, and the PDF is absent from the repository. Older architecture documents describe an earlier immediate-booking design. Reconcile any additional PDF requirements when a durable PRD copy is available; do not claim a full PDF audit.

Already implemented and to extend:

- MERN npm workspaces, plain JavaScript ES modules, Node >=22.12, Express 5, Mongoose 8, React 19, React Router 7 and Vite.
- Driver/owner registration, login, in-memory access tokens, rotating HttpOnly refresh cookies, session restore/logout, live role/account checks, seeded admin.
- Admin owner approval/rejection/suspension, mall submission/review/publication/deactivation, approved-only public discovery.
- Owner floor/row editor, stable UUID bay IDs, gaps, editable draft, driver preview, publication, maintenance and reopening.
- Public bay map preserving published rows and gaps. Mall ObjectIds and bay UUIDs are different identifier types.
- Time-window reservations, per-bay overlap prevention using MongoDB transactions, cancellation before scheduled arrival, rate snapshots, dedicated `/dashboard/bookings`.
- Midnight blue/ivory/lime design across role shells, auth, discovery, inventory and reservations.
- Existing integration tests include competing reservations, adjacent windows, cancellation, ownership, and inventory protection.

Confirmed v2 boundary: uploaded floor-plan recognition, freeform spatial editing, turn-by-turn indoor navigation, GPS/sensor integration and 3D maps. The current map is schematic. Payments, SMS/email delivery, prediction, waitlists and dynamic pricing appear in old future lists without an implemented contract. Track these as optional follow-on features, and only include them in v1 if the project owner confirms the corresponding PRD requirement. Final bills and printable receipts are included in v1; payment collection is a separate decision.

`dbms/*.sql` and the ER PNG are academic relational deliverables. Runtime persistence remains MongoDB. The two additional submission files were pushed on `codex/dbms-submission`; they may not yet exist in the active branch. Check that branch before recreating them.

### Integration prerequisites and ownership

Before implementing, run `git status --short --branch`, `git diff --check`, and inspect the live code. If a merge is in progress, complete or isolate it explicitly before branching; preserve teammates' edits. The audited checkout still has staged upstream `* 2.jsx`, `* 2.js` and review patch artifacts. Ocean owns a focused cleanup after checking references and exact duplicates. Avoid importing the duplicate files.

Both people start from the same integration commit containing the reservation work and the dedicated bookings page. A clean checkout of the earlier team main alone is insufficient. Record that common commit in the first PR description. Use separate branches from that commit:

- Mehak: `codex/mehak-backend-completion`.
- Ocean: `codex/ocean-frontend-completion`.

Mehak owns `server/**`, backend package changes, backend environment examples, backend tests and the API contract's backend details. Ocean owns `client/**`, frontend package changes, frontend tests, application routing/navigation, CSS and release documentation. Ocean owns final shared-file integration of root `package.json`, `package-lock.json`, CI, README and deployment configuration. Coordinate dependency additions to the single lockfile through one focused integration commit. Any backend-only lockfile delta Mehak prepares must be communicated to Ocean.

Both files intentionally contain the same shared contract. Change that section in both documents together when the contract changes. Use feature PRs targeting the shared integration branch, then integrate and test before merging to team main. Neither person should replace an entire shared file to resolve a conflict without inspecting both sides.

### Local setup and baseline validation

Use `npm ci` at the repository root. Backend loads `server/.env`. Frontend uses `client/.env`.

- Backend `PORT=5001`, `CLIENT_URL=http://localhost:5173`, transaction-capable MongoDB URI with `replicaSet=rs0` locally, sufficiently strong JWT secret.
- Frontend `VITE_API_URL=http://localhost:5001/api`; no secrets in any `VITE_*` value.
- `npm run dev`, or separate `npm run server` and `npm run client`.
- `npm run seed:admin --workspace server` uses local admin environment variables.
- Integration tests use an isolated replica set through `AUTH_TEST_MONGODB_URI`, creating/dropping their own random database. Never point the test URI at production.

Run checks sequentially, because the frontend runner temporarily creates `client/test/.temp.*.mjs` files that can interfere with lint:

```bash
npm test
node client/test/run-tests.mjs
npm run lint
npm run build
git diff --check
```

At this audit lint/build pass when run separately from the test runner. Five executable frontend suites report 48 passing tests. Two frontend suites fail to bundle because they import removed token-storage/auth exports; Ocean must migrate those tests to the current session API. This is an existing failure, not a passing full frontend baseline. Database integration results from previous work were 14 passing tests; rerun on the final integrated code. A backend run that skips the database lifecycle is insufficient for gate/concurrency sign-off.

### Existing runtime interfaces to preserve

All paths below include the `/api` prefix. Frontend service helpers use paths without that prefix.

| Interface | Current behavior |
| --- | --- |
| `POST /auth/register`, `POST /auth/login` | Login/session response with user and access token; privileged role registration rejected. |
| `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` | Cookie origin/header protection, rotating refresh family, bearer profile. |
| `GET /malls`, `GET /malls/:mallId` | Public approved profiles. |
| `POST /malls`, `GET /malls/owner/my-malls` | Approved-owner submission and own listings. |
| `GET /malls/:mallId/inventory` | Owner's draft/published layout plus revision. |
| `PUT /malls/:mallId/inventory/draft`, `PUT /malls/:mallId/inventory/published` | Revision-checked layout writes. |
| `PATCH /malls/:mallId/inventory/bays/:bayId` | Owner maintenance/reopening with revision. |
| `GET /malls/:mallId/slots?startTime=…&endTime=…` | Published rows plus availability for an optional window. |
| `POST /bookings` | `{mallId,bayId,vehicleType,vehicleNumber,startTime,endTime}`. |
| `GET /bookings` | Current driver's own bookings. |
| `PATCH /bookings/:id/cancel` | Own reservation, cancellation before scheduled start, repeat cancellation succeeds. |
| `GET /admin/mall-owners`, `PATCH /admin/mall-owners/:userId/status` | Admin account reviews. |
| `GET /admin/malls`, `PATCH /admin/malls/:mallId/status` | Admin mall reviews. |

Keep scheduled windows, existing field names and routes. ISO UTC timestamps are stored/transported; display times in IST. Adjacent intervals use `[startTime,endTime)` and can share an endpoint. Current limits are 30 minutes–8 hours in 30-minute increments and arrival within 90 days. Current mall price is integer `hourlyRatePaise`; the booking snapshots it. Physical bay state `AVAILABLE/MAINTENANCE` stays distinct from computed `RESERVED/OCCUPIED` at a requested time.

A user's multiple non-overlapping future reservations remain valid. Enforce at most one physically `ACTIVE` visit per driver and per bay. An old blanket unique index over all `CONFIRMED` reservations would break the scheduled-booking flow.

### Proposed shared v1 operations contract

The following endpoints and fields are **new implementation targets**, not claims that they already run. Envelope: `{success:true,data:{...}}`, optional human-readable `message`; errors `{success:false,message,error:{code,details?}}`. Use 400 validation, 401 unauthenticated, 403 role/scope denial, 404 inaccessible resource, 409 state conflict, 429 throttling. Browser protected calls use existing `sessionRequest`, never an alternate token store.

| Endpoint | Caller and request | Required data payload |
| --- | --- | --- |
| `POST /malls/:mallId/guards` | Active owning owner or admin. `{name,email,phone?,initialPassword,gateLabel?}`. Explicit action to create a GUARD and active assignment. | `{guard,assignment}`, sanitized user; no password/hash/token. |
| `GET /malls/:mallId/guards` | Owning owner or admin. | `{guards:[{user,assignment}]}`. |
| `POST /malls/:mallId/guard-assignments` | Owning owner or admin, `{guardId,gateLabel?}`; guard must already exist. | `{assignment}`; scoped validation, no arbitrary role conversion. |
| `PATCH /guards/assignments/:id` | Owning owner or admin, `{isActive,gateLabel?}`. | `{assignment}`; disable access immediately. |
| `GET /guards/my-assignments` | Active GUARD. | `{assignments:[{id,mallId,mallName,gateLabel,isActive}]}`. |
| `GET /bookings/:id` | Owning driver, owning mall owner, assigned guard, or admin. | `{booking}` using additive fields below. |
| `POST /bookings/:id/qr` | Owning driver, `{purpose:"ENTRY"\|"EXIT"}`. | `{bookingId,purpose,token,expiresAt}`; create/rotate a scoped QR credential. |
| `POST /qr/verify` | Assigned guard, `{mallId,token,action:"ENTRY"\|"EXIT"}`. | `{booking,allowed,reasonCode}`; preview only, final operation revalidates. |
| `POST /operations/entry`, `POST /operations/exit` | Assigned guard, `{mallId,token,operationId}`, UUID generated per deliberate scan operation. | `{booking,operation,bill?}`; replay of identical operationId/request returns original result. |
| `GET /operations/recent?mallId=…&limit=20` | Assigned guard, owner or admin. | `{operations:[{id,bookingId,mallId,bayId,action,guardId,occurredAt}],nextCursor}`; maximum 100, pagination. |
| `GET /malls/:mallId/bookings?status=…&limit=20` | Owning owner or admin. | `{bookings,nextCursor}`; no cross-mall leak. |
| `GET /bookings/:id/bill` | Same resource authorization as booking details. | `{bill}`; 409 `BILL_NOT_READY` until finalized. |
| `GET /analytics/owner/overview` | Approved owner; scope derived from identity. | `{metrics,perMall,series,generatedAt}`. |
| `GET /analytics/owner/malls/:mallId` | Owning owner. | Same metrics shape for one owned mall. |
| `GET /analytics/admin/overview` | Admin. | Same metrics shape plus `ownerCount,mallCount,pendingOwnerCount,pendingMallCount`. |
| `PATCH /malls/:mallId` | Owning approved owner; editable profile fields and hourlyRatePaise. | `{mall}`; whitelist edits, preserve booking snapshots. |
| `GET /users/profile`, `PATCH /users/profile` | Signed-in active account; patch `{name,phone?}`. | `{user}`, sanitized. |
| `PATCH /users/password` | Active user, `{currentPassword,newPassword}`. | Success; revoke refresh families and require fresh login. |

Mehak owns server implementation; Ocean owns consuming services and screens. Mehak adds route registration because `bookingRoutes.js` currently authorizes USER at router scope. Detail/bill reads need per-route authorization to support other roles without exposing driver lists/create/cancel.

Additive booking DTO (retain existing values and names):

```text
_id, driverId (only when authorized), mallId, mallName, bayId, slotCode, floor,
vehicleType, vehicleNumber, startTime, endTime, hourlyRatePaise,
totalAmountPaise (reservation estimate), status, canCancel,
entryDeadline, entryTime|null, exitTime|null, billingStatus,
billAvailable, qrEligiblePurposes[], cancelledAt|null
```

Terminal `ENDED` is currently a serializer-only label for a CONFIRMED booking after its scheduled end. Migrate explicitly: unentered bookings past entryDeadline become persisted EXPIRED; entered visits become ACTIVE/COMPLETED based on actual operations. Preserve records. While migration rolls out, Ocean renders legacy ENDED as a past unverified reservation, never as a verified completed visit.

Bill DTO:

```text
id, bookingId, mallId, mallName, slotCode, floor, vehicleNumber,
entryTime, exitTime, durationMinutes, billableHours,
hourlyRateSnapshotPaise, calculatedAmountPaise, currency:"INR",
billingStatus:"GENERATED", generatedAt, policyVersion
```

`GENERATED` means a bill exists. Cash/card/online settlement and a paid status need a separately implemented payment flow. Revenue cards label the current metric **billed amount**.

Analytics DTO:

```text
metrics: {totalBays,availableNow,reservedNow,occupiedNow,maintenanceNow,
          upcomingBookings,activeVisits,completedVisits,expiredBookings,
          cancelledBookings,billedAmountPaise}
perMall: [{mallId,mallName,metrics}]
series: [{date:"YYYY-MM-DD",completedVisits,billedAmountPaise}]
generatedAt: ISO UTC timestamp
```

Support optional `from=YYYY-MM-DD&to=YYYY-MM-DD` with inclusive IST calendar dates, default last 7 calendar days including today, maximum 90 days. Counts of completed/expired/cancelled and series use their transition timestamp in that date interval; billed amount uses final bill generation. `upcomingBookings` and `activeVisits` plus all bay-state counts are current snapshots, independent of the historical filter. Per published bay, count once in priority order occupied > maintenance > reserved at now > available. Exclude unpublished drafts and removed bays from capacity; historical bills remain available for inactive malls.

### Lifecycle and provisional policy defaults

These are explicit proposed defaults for completing the MVP, supplied here so both implementations can proceed consistently. They require project-owner acceptance before release and must be configurable and documented.

- Allow entry from scheduled start to `min(startTime + ENTRY_GRACE_MINUTES, endTime)`, default grace 15 minutes; deadline is exclusive. No early-entry promise.
- Unentered CONFIRMED bookings expire at entryDeadline. Run an idempotent expiry job and perform lazy eligibility checks on reads/writes so a delayed worker does not leave stale holds.
- Entry atomically changes CONFIRMED → ACTIVE, records server entry time and the guard, and consumes the ENTRY credential. Issue a distinct EXIT credential to the driver after entry.
- Exit atomically changes ACTIVE → COMPLETED, records server exit time and guard, finalizes one bill, consumes the EXIT credential, and releases runtime occupancy.
- Cancellation is allowed only before scheduled start and before entry; retain repeat-cancel idempotency. Revoke credentials atomically.
- ACTIVE visits remain occupied after scheduled end until explicit exit. Never auto-complete or free an occupied bay by scheduled time. A later reservation may remain confirmed but entry must reject if its bay is still occupied.
- Current availability blocks an ACTIVE bay until exit. Future-window availability conservatively marks any currently ACTIVE bay unavailable because exit time is unknown. Retain scheduled reservations and explain conflicts to drivers.
- Billing default: minimum one hour, partial hours rounded up using actual server entry/exit. `durationMinutes=max(1,ceil((exit-entry)/60000))`; `billableHours=max(1,ceil(durationMinutes/60))`; `calculatedAmountPaise=billableHours*hourlyRateSnapshotPaise`. Show the estimate and actual bill separately. No extra penalty, tax or EV surcharge without an explicit policy.
- QR credential TTL defaults to 5 minutes, configurable by `QR_TTL_SECONDS`; ENTRY expiry also bounded by entryDeadline. Expired credentials can be reissued when the booking is eligible. ACTIVE drivers can obtain an EXIT credential even after scheduled end. Do not expire that visit with the ENTRY worker.
- Owners/admins cannot deactivate a mall or destructively modify a bay with an ACTIVE visit or live future reservation. Display 409 and require resolving that dependency. Keep exits operational if legacy data or an earlier admin action has already made a mall inactive. Treat a suspended owner as unable to manage the mall; this alone must not strand legitimate existing driver exits.
- Worker configuration defaults to a 30-second sweep, with bounded batches and no overlapping local runs. Record grace/QR/worker settings and a billing policy version in the server environment example.
- Guard creation uses an operator-entered temporary password, a first-login change requirement, and explicit manual secure handoff. Do not require an email provider for this baseline. Guard must change password before gate access. New assignment and existing assignment management are distinct flows. Sanitized user responses include mustChangePassword so the frontend can route the guard correctly.

### Shared completion scenario

Using isolated fixtures, demonstrate:

1. Admin approves an owner; owner submits mall; admin approves mall.
2. Owner publishes B1 with two CAR bays, a gap, and one accessible bay; draft edits stay private.
3. Driver books a future window; competing request receives 409; adjacent window succeeds.
4. Owner assigns a guard. Wrong-mall/suspended/unassigned guard is denied.
5. Driver displays ENTRY QR, guard previews then confirms, visit becomes ACTIVE and map shows occupancy.
6. Repeated scan or concurrent entry produces one state transition and one operation event.
7. Driver gets EXIT QR, guard confirms, one bill is generated at the original snapshot rate and bay becomes available.
8. Bill appears on driver history and the owner's/admin's billed amount. Another owner's dashboard cannot see it.
9. Cancel another future reservation and expire a no-show; credentials and availability update consistently.
10. Run desktop/mobile keyboard and real-camera tests, all checks, deployment smoke test and final README instructions.

Completion requires both backend and frontend acceptance criteria, migrations, an isolated repeatable demo, and documented operational configuration. Report any unavailable PRD requirement or pending policy approval in the final project handoff.
