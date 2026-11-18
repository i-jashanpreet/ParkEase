# Ocean — Frontend, integration and release handoff

## Assignment and expected result

Own all remaining ParkEase v1 frontend screens, client services, accessibility and role navigation, then integrate Mehak's backend and prepare the runnable release. Deliver the full driver → guard → owner/admin demonstration. Mehak owns backend domain logic, APIs, transactions, billing and analytics computation.

This document is an implementation brief for you or an agent you delegate to. The shared contract later in this file gives endpoint shapes, DTOs, states and proposed policy defaults. Build against those contracts while Mehak completes server endpoints.

## Start here

1. Inspect Git status. Use the common integration baseline described in the shared section, including reservations and the dedicated bookings route.
2. Read `client/src/App.jsx`, `layouts/DashboardLayout.jsx`, `context/AuthContext.jsx`, `services/authService.js`, `services/api.js` and the current role pages.
3. Reuse `sessionRequest` for protected services. It owns the current in-memory bearer token and refresh-retry logic. Public requests continue using the existing API client.
4. Reuse `PageHeader`, `Card`, `Button`, `Input`, `Select`, `Modal`, `Badge`, `ErrorMessage`, `EmptyState`, `Icon`, `FloorRows`, `formatBookingTime` and `formatRupees`.
5. Create dedicated role pages when necessary rather than expanding `AccountDashboard` into a giant conditional component.
6. Get a JSON fixture and failure example for each endpoint from Mehak. Keep fixtures isolated to tests/dev tooling; production pages must represent backend data and connection failures accurately.

## Design and interaction contract

Retain the accepted identity:

| Element | Value |
| --- | --- |
| Sidebar/map | Midnight blue `#142536` |
| Page background | Ivory `#F7F8F2` |
| Panels | White `#FFFFFF` |
| Primary actions | Teal `#087F75` |
| Selection | Lime `#D5F568` with dark text |
| Main / secondary text | `#172B3A` / `#607080` |
| Borders | `#DEE5E7` |

Extend `theme.css` and existing reusable components. Favor simple readable sans-serif type, restrained icons and clear information hierarchy. Color carries a label/icon/pattern for availability and scanner results. Keep driver map rows/gaps stable when filtering. All currency labels use INR; all parking schedule times are explicitly IST. Personal browser timezone must not change the booking's displayed meaning.

Required states on each asynchronous screen: initial loading, loaded data, genuine empty state, permission denial/session expiry, network/server failure, retry, in-flight mutation, success feedback and stale/conflict response. Preserve entered form values when a recoverable conflict occurs. Abort obsolete requests on route/filter changes. Disable duplicate submissions. Components need keyboard labels and visible focus, not hover-only controls.

## O1. Frontend foundation and navigation

### Existing test debt

Migrate `client/test/apiClient.test.js` and `client/test/authContext.test.js` to the current API. They import removed `tokenStorage`, auth defaults and pending-auth constants. Assert session restoration, refresh serialization/retry, logout and protected-role behavior using the real current interfaces. Do not restore obsolete token persistence exports just to satisfy stale tests.

If server rendering auth providers is tested, use a stable `getServerSnapshot` or an isolated AuthContext fixture appropriate to the test. Tests must not make uncontrolled real network calls. Keep node:test/esbuild runner behavior unless a measured gap justifies a test dependency. Add a supported root `test:client` script when fixing root scripts.

### Route plan

Ocean owns `App.jsx` and `DashboardLayout.jsx` integration. Preserve all current paths and add:

| Page path | Access | Purpose |
| --- | --- | --- |
| `/dashboard` | Authenticated, role-based | Existing overview enhanced with metrics/actions. |
| `/dashboard/bookings` | USER | Existing My bookings, lifecycle/QR/bill upgrades. |
| `/dashboard/bookings/:id` | USER owning booking | Shareable reservation detail, QR and receipt links. |
| `/dashboard/bookings/:id/bill` | USER owning booking | Final receipt with print layout. |
| `/dashboard/guards` | MALL_OWNER/ADMIN | Guard creation and scoped mall assignments. |
| `/dashboard/operations` | GUARD | Assignment selector, scanner and entry/exit result. |
| `/dashboard/activity` | GUARD | Recent assigned-mall gate operations. |
| `/dashboard/analytics` | MALL_OWNER/ADMIN | Scoped live metrics plus reporting date filter. |
| `/dashboard/profile` | Signed-in active accounts | Name/phone and password change. |

Existing owner inventory `/dashboard/malls/:id/inventory` remains reachable. Owner mall profile edits can use a dedicated `/dashboard/malls/:id/edit` page. If layout component simplification is needed, keep functional route compatibility.

Sidebar entries:

- USER — Overview, Find parking, My bookings, Profile.
- MALL_OWNER — Overview, My malls, Submit a mall, Guards, Analytics, Profile.
- GUARD — Gate console, Recent activity, Profile. First-login password change redirects before gate use.
- ADMIN — Overview, Mall approvals, Owner approvals, All malls, Guards, Analytics, Profile.

Use current-page styling, working breadcrumb labels, collapsed mobile drawer with focus containment/Escape/return focus and scroll lock. After logout, privileged page content and raw QR state clear. Existing public mall discovery remains accessible to signed-out users.

**O1 acceptance:** all role routes render through protected entry points, direct URLs survive refresh, unauthenticated user redirects preserve return location, wrong role cannot reach a privileged view, complete frontend test runner passes.

## O2. Driver reservation details, QR display and final bill

### My bookings

The current `DashboardPage bookingsOnly` implementation lists reservations and supports cancellation. Extend it or extract reusable booking list/detail components so overview and the dedicated page share behavior.

- Filters Upcoming, In progress, Past, Cancelled; include expired no-shows in past with explicit EXPIRED label.
- Show mall, floor, bay, plate, IST time window, status and estimate. A historical ENDED legacy row must not imply a guard-verified completed visit.
- Sort upcoming visits nearest first, in-progress by entry time and historical rows newest first.
- Fetch `GET /bookings/:id` for the authoritative full detail page.
- Use server `canCancel` and QR eligibility fields. After mutations refetch/replace server result; don't invent successful completion.
- Retry conflicting actions with updated eligibility while retaining relevant data.
- Keep the top-of-map My bookings shortcut, confirmation shortcut and overview action.

### QR display

Build a focused credential component backed by `POST /bookings/:id/qr`. Mehak returns the opaque token. Use a reviewed QR rendering library, added through workspace dependency workflow. The QR encodes the token and uses sufficient contrast and quiet zone.

- Explicit purpose label Entry pass or Exit pass and server-derived expiry countdown.
- Request credentials only for eligible bookings/purpose. Reissue is explicit because it invalidates old scans.
- Keep raw token in component memory. Do not place it into localStorage, a URL, a DOM debugging dump, telemetry or a downloadable receipt.
- Display full bay/plate/window beside the QR so a driver can identify the visit.
- On entry success detected by refresh/polling, switch to ACTIVE and offer EXIT credential.
- Poll only while detail/pass is visible, abort/stop when hidden/unmounted, use a modest interval such as 15 seconds plus focus refresh. Countdown uses a clock interval with cleanup.
- A pass expiring closes its usable state and offers reissue when allowed.
- Show early-arrival, no-show-expired, cancelled, completed, permission and offline states.
- Never turn a booking UUID/reference number into a QR credential fallback.

### Receipt

Consume `GET /bookings/:id/bill` and show the exact bill DTO. Render reference, mall/vehicle/bay, actual entry/exit, duration, hourly rate snapshot, billable hours, final paise amount and policy version. Show reservation estimate separately if included. Mark amount as billed, with no paid claim.

Provide a printable HTML receipt using print CSS and the browser print dialog. It should fit a page at normal scale and avoid printing sidebar/actions/QR secrets. A PDF download is optional if printing fulfills the submission/demo requirement. Give a helpful state for BILL_NOT_READY.

**O2 acceptance:** driver opens My bookings from the sidebar, scans real generated QR, sees the correct state after entry/exit, can reissue when eligible, can cancel before arrival, and can print the actual final receipt.

## O3. Guard gate console and assignment management

### Owner/admin guard management

Create `guardService.js` around the shared endpoints.

- Owner selects an owned approved mall; admin can select an approved mall across the platform.
- List guard name/email, assignment, gate label and active status.
- Separate **Create guard** form from **Assign existing guard**.
- Create guard collects name/email/phone, temporary initial password and optional gate label. Manual password handoff is explicit, and the server never echoes it.
- Existing-guard assignment uses explicit guard identity, no editable role/status field.
- Deactivation and gate label changes display the returned assignment status.
- Handle duplicate email, wrong scope and inactive mall failures without converting another user's account.
- First-login guard sees password change before the gate console; current credentials/new password input are cleared after submission and fresh login.

### Gate console flow

1. Fetch `GET /guards/my-assignments`; choose an active assigned mall and gate.
2. Choose Entry or Exit explicitly.
3. Open camera on a user gesture, or manually paste a token as a fallback.
4. Parse token and call `POST /qr/verify` with selected mall and action.
5. Show preview with bay, plate, booking window, current state and eligibility reason.
6. Enable Confirm entry/exit only if allowed. Generate one operationId per deliberate operation, retain it for retries of that request, and send the frozen token/mall/action.
7. Display success and returned server timestamp. Exit displays final bill. Refresh current activity and get ready for the next scan.

Camera requirements:

- Use a maintained QR decoder compatible with target desktop/mobile browsers. Document HTTPS/localhost camera requirement.
- Stop tracks and decoder callbacks on navigation, modal close, mode/mall change and unmount.
- Debounce repeated video frames; one QR should open one preview, not make dozens of requests.
- Handle permission denied, no camera, unsupported browser, busy camera and offline errors with the manual option.
- Distinct result text for malformed token, token expired/used, wrong mall, wrong state, too early, deadline passed, active-driver conflict and occupied bay.
- Mehak's preview is advisory. Final 409 may happen after an allowed preview; display that conflict and refresh.
- Never log tokens. Ignore scanned URLs or unexpected JSON commands; only extract the application's documented QR payload.

Recent activity uses actual `/operations/recent` data scoped to the selected assignment, with timestamps, bay and action. The empty assignment state explains that an owner/admin needs to assign the guard.

**O3 acceptance:** entry/exit works with camera and manual token, duplicate frames cannot create duplicate actions, request retries keep operationId, wrong-mall guard receives denial, activity refreshes and camera releases on leaving.

## O4. Owner/admin dashboards, analytics and listing edits

Add `analyticsService.js` and consume the shared metrics contract. Build screens before API readiness using isolated DTO fixtures, then verify real endpoints before claiming completion.

Owner dashboard:

- Own-mall selector, published capacity, available/reserved/occupied/maintenance counts, current active visits.
- Completed visits, expired/cancelled totals and **billed amount** for the chosen IST date range.
- Time-series view of completed visits and billed amount, with accessible table alternative.
- Per-mall cards/table and a scoped booking list with status filters and pagination.
- Shortcuts to inventory, listing edit and Guards.
- Manual refresh plus optional 15-second visible-tab polling for operational snapshots. Show last updated timestamp.
- Mall profile/rate edit form uses Mehak's whitelist; show effect on future reservations and review status. Keep snapshots shown on existing bookings.

Admin dashboard:

- Preserve owner/mall approval workflows and add cross-platform reporting with the same historical/current metric distinction.
- Pending approvals, account/mall counts, active visits, per-mall occupancy and billed amount.
- Guard provisioning/assignment entry point with explicit selected mall.
- Display 409 dependency errors on mall deactivation, instead of hiding an occupied mall and claiming success.

Charts must use actual totals. Do not use hardcoded positive trends, random metrics or empty-state revenue. A zero-value response differs visibly from a failed request.

**O4 acceptance:** two different owners see disjoint datasets, admin sees the authorized aggregate, date filters use IST, capacity excludes drafts, and changing current mall rate never changes a previous booking's estimate or final snapshot rate.

## O5. Profile, accessibility and frontend regression checks

Profile supports view/edit name and phone through shared endpoints, plus password change. Preserve email/role/status as read-only. Display temporary guard password requirement prominently. Use existing password validation and auth service behavior. After password change, clear local session using a small reviewed session-service hook if needed and redirect to fresh login. Do not add an endpoint-free forgot-password flow that claims email delivery.

Audit all screens at 390px, 768px and desktop:

- No horizontal page overflow; parking row scrolling stays inside its panel.
- Touch targets, keyboard form interaction, readable status labels and sufficient text contrast.
- Accessible dialogs: remove hidden-ancestor aria conflicts, trap focus, Escape/backdrop rules, initial focus and return focus. Existing Modal currently needs this audit.
- Screen reader names for map bays include floor/code/status; live success/error announcement without repeated spam.
- Bottom-sheet reservation details on mobile; safe close behavior during mutation.
- Loading state and disabled submit prevent duplicate actions. Refetch on session/user switch so old identity's data cannot linger.
- Auth token refresh failure clears privileged content; 401 handling follows existing session service.
- Post-confirmation navigation and deep link refresh work.
- Bills print cleanly with no extra blank page.
- Raw QR credentials and temporary passwords clear when no longer needed.

Add focused interaction regressions for QR expiry/reissue, camera cleanup, operationId retry retention, role navigation, driver cancellation, frontend currency conversion and API error states. Keep production components free from fake success fallbacks. Use fixtures for isolated component checks and real API scenarios for integrated sign-off.

## O6. Integration, repository cleanup, documentation and deployment

Ocean owns the final integration branch. Merge Mehak's batches incrementally, resolving current code rather than restoring outdated architecture wholesale.

### Cleanup and documentation

- Compare `FloorRows 2.jsx`, `InventoryPage 2.jsx`, `inventoryRoutes 2.js` with canonical modules. If exact duplicates and unused, remove in one focused cleanup commit after Mehak coordination.
- Review/remove tracked review patch artifacts as repository cleanup without discarding unique work. Keep actual DBMS deliverables.
- Update README's stale implemented/deferred lists and setup directions.
- Reconcile docs/API_CONTRACTS.md, DATABASE_DESIGN.md and ARCHITECTURE.md with the actual scheduled-window/embedded-inventory design and new gate lifecycle, with Mehak supplying server details.
- Preserve DBMS submission files; update their implementation-status wording later if gate features require alignment, with a reviewed academic-doc change.
- Add a safe isolated demo seed for admin, owner, driver and guard, published rows and non-production test visits. Mehak provides server-side seed internals if needed; credentials come from environment and never enter Git.
- Add CI with separate sequential frontend-test/lint/build steps and backend integration against a real transaction-capable MongoDB service. Ensure the replica set is initialized and reachable from the CI runner before tests.
- Keep root package/lockfile changes coordinated. Do not claim green CI when frontend suites fail to import or DB tests are skipped.

### Deployment

Prepare deployment configuration and instructions for a static React frontend and persistent Node API, backed by transaction-capable MongoDB/Atlas. The exact hosting provider is not selected. Build provider-neutral instructions first; choose a provider with the project owner before provisioning paid resources or publishing.

- Frontend `npm run build`, output `client/dist`, SPA fallback to index.html for all client routes.
- Backend `npm start --workspace server`, use assigned PORT, correct API base URL and CLIENT_URL.
- Use HTTPS; host layout should support refresh-cookie flow. Existing production cookie defaults must be tested with the chosen domain arrangement. Coordinate SameSite/secure adjustments with Mehak.
- Camera scanning requires secure context. Verify real mobile camera on the deployed host.
- Keep secrets server-side, configure a real strong JWT secret, reset default admin credentials, seed once through documented steps.
- MongoDB replica set, transaction/index readiness, expiry worker lifecycle and graceful restart are verified.
- Startup must start the worker once per process and maintain idempotency across multiple processes, as implemented by Mehak.
- Document database backup/restore and migration order. Exercise a safe backup/restore only with disposable data or approved environment.
- Distinguish liveness from database/worker readiness. Verify SPA direct routes, login refresh, create/cancel, QR entry/exit and final receipt after deployment.
- Record exact build/start commands, environment names, service URLs, deployment date and known limits in the release handoff.

**O6 acceptance:** the reproducible local demo passes, clean CI passes, deployment is ready for an explicitly chosen host, and all live deployment checks run if publishing is authorized.

## Ocean's delivery batches and coordination

1. **Frontend foundations PR** — stale tests, role routes/sidebar, client service stubs and DTO fixtures.
2. **Driver PR** — reservation detail, QR purpose/expiry/reissue and printable final bill.
3. **Staff PR** — guard management, first-login password change, camera/manual gate console and recent activity.
4. **Reporting PR** — owner/admin dashboards, analytics, scoped listing edits and profile.
5. **Integration/release PR** — real API verification, duplicate cleanup, accessible interactions, CI, docs, seed/demo and deployment preparation.

You can complete O1 immediately. O2–O4 screens can use the shared fixtures while Mehak implements the server. Mark APIs as unavailable with an accurate message until connected. Integrate M1/M2 DTOs before first end-to-end driver/guard check. Integrate M4 billing before reporting totals.

Frontend/release completion checklist:

- [ ] All sidebar destinations are implemented and role-appropriate.
- [ ] My bookings supports persisted lifecycle, detail, cancellation, QR and final receipt.
- [ ] Guard scanner works with camera and manual fallback with cleanup.
- [ ] Guard management and first-login credential change are usable.
- [ ] Owner/admin reports use live authorized metrics with explicit date semantics.
- [ ] Profile/password changes and session revocation behave correctly.
- [ ] Desktop/mobile/keyboard and accessible dialog checks pass.
- [ ] All frontend test suites import and pass; build/lint pass.
- [ ] Integrated DB-backed lifecycle and concurrency tests pass with Mehak.
- [ ] Stale documentation and duplicate files reconciled without losing work.
- [ ] CI, environment instructions, migration/seed instructions and demo are reproducible.
- [ ] Shared completion scenario demonstrated and release policy decisions disclosed.
- [ ] Deployment provider/configuration/permissions recorded before publication.

## Agent execution instruction

Read this entire file and Mehak's ownership section. Audit the current checkout. Implement Ocean's batches, preserving the accepted visual design and working reservation flow. Reuse existing session transport and components. Build new screens against the shared contract and keep fixtures isolated. Integrate real APIs as Mehak's batches arrive, fix frontend test debt and finish responsive/accessibility checks, shared-file integration and release preparation. Report actual verified behavior and any concrete API/policy/provider dependency that still needs project-owner input.

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
