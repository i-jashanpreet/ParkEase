# ParkEase — Team Execution & Contribution Guide

> **Project:** ParkEase — Smart Mall Parking Intelligence System  
> **Repository:** https://github.com/oceankumar/ParkEase  
> **Base branch:** `main`  
> **Team:** Ocean, Shikhar, Jashan, Mehak  
> **Status:** Proposed team plan. Add actual sprint dates and GitHub issue numbers at kickoff.

This document is the working agreement for the four-person team. It assigns module ownership, defines the order in which features should be merged, and establishes a consistent GitHub workflow so that the project remains one integrated codebase.

The current repository is a shared MERN foundation. The parking-specific features described in the PRD are planned work and must not be presented as implemented until they have been built, tested, reviewed, and merged.

---

## 1. Team goals and working principles

1. `main` is the shared integration branch. Nobody commits directly to it.
2. Every task starts with a GitHub Issue. Every code change is made on a short-lived branch and submitted through a Pull Request (PR).
3. Every PR must have one accountable author, a linked issue, a focused diff, test evidence, and at least one approval from another teammate.
4. Agree on API contracts, schema fields, enums, and state transitions before parallel work depends on them.
5. A module owner is responsible for implementation, tests, documentation, and fixes in that module. Other members should review and can contribute through separately scoped PRs.
6. Keep the root npm lockfile consistent. Dependency changes must be coordinated and made from the repository root.
7. Never commit credentials, `.env` files, database dumps, generated secrets, or real user data.
8. A green build is necessary, but reviewers must also check business rules, authorization, data consistency, and edge cases.
9. Build the MVP in dependency order. Do not start a dependent feature against an assumed or unstable API.

## 2. Team ownership

The split intentionally assigns the largest backend workload to **Shikhar**, with **Ocean** owning backend foundation, identity, access control, and security. **Jashan** owns the frontend application and integration. **Mehak** owns parking operations, QR/billing workflows, and quality assurance, with backend implementation coordinated against the core booking model.

### Ocean — Backend foundation, identity and access

**Primary ownership**

- Backend architecture conventions and shared server-side patterns.
- Authentication: registration, login, password hashing, token issuance and verification.
- User model and safe role assignment.
- Authentication middleware and server-side RBAC middleware.
- Shared authorization and error-handling conventions.
- Security review of protected endpoints and sensitive operations.

**Deliverables**

- Agreed auth contract and role/permission matrix.
- User model, authentication routes, controllers, services, and validation.
- Password hashing and token verification.
- Middleware for authenticated users and role restrictions.
- Tests for duplicate registration, invalid credentials, missing/invalid tokens, role escalation, and forbidden operations.
- Security review notes and auth API documentation.

**Boundaries**

- Ocean owns authentication and access-control implementation.
- Ocean should not independently redesign Shikhar's Mall, Slot, or Booking schemas.
- Ocean reviews authorization and security in other modules without silently taking over their ownership.

### Shikhar — Core backend, inventory, booking engine and integration

**Primary ownership — largest implementation workload**

- Shared data model and cross-module backend design, in coordination with Ocean.
- Mall submission, status, approval workflow, and owner-scoped mall operations.
- Parking slot CRUD, indexes, and availability queries.
- Booking creation, cancellation, and lifecycle.
- Atomic slot allocation and one-active-booking enforcement.
- Consistent slot/booking writes, transaction strategy, and conflict handling.
- Backend integration and technical acceptance testing.
- Mall Owner and Admin analytics APIs in the final delivery phase.

**Deliverables**

- Shared entity/state/API contract proposal.
- Mall, ParkingSlot, and Booking Mongoose models and indexes.
- Mall Owner and Admin mall APIs, approval/rejection, and slot management APIs.
- Atomic booking creation, active-booking rule, cancellation, and slot release.
- Concurrency/integration tests proving no double allocation.
- Analytics aggregation APIs and integration/release checklist.

**Boundaries**

- Shikhar owns core inventory and booking invariants.
- Shikhar coordinates QR/entry/exit integration with Mehak and Ocean.
- Changes to shared model fields, routes, enums, or status transitions must be discussed before implementation.

### Jashan — Frontend application and API integration

**Primary ownership**

- React/Vite frontend architecture, reusable components, layouts, and navigation.
- Routing, forms, loading/empty/error states, and responsive styling.
- Login/register screens and auth-aware UI after Ocean's API contract is agreed.
- User mall discovery, mall details, availability, booking, cancellation, and booking history UI after Shikhar's APIs are agreed.
- Mall Owner and Admin frontend views.
- Central API client and frontend integration tests.

**Deliverables**

- Application shell, page layouts, and role-aware navigation.
- Auth forms, session handling, and protected-route UX.
- Mall discovery and user booking journey.
- Owner/Admin mall and slot management screens.
- Booking, QR display, and billing presentation integrated with backend endpoints.
- Dashboard pages, API client, responsive UI, and frontend build verification.

**Boundaries**

- Frontend route guards are for user experience only. Backend authorization is authoritative.
- Do not invent endpoint names or response shapes. Ask the API owner and use the agreed contract.
- Do not put secrets in `VITE_` environment variables; Vite variables are exposed to the browser.

### Mehak — Parking operations, QR, billing and quality assurance

**Primary ownership**

- Guard-facing workflows and operational journey.
- QR verification/scanning integration, entry, and exit flows.
- Billing calculation/display and booking receipt/history UX.
- End-to-end test scenarios, acceptance checklists, synthetic test data, and QA reports.
- API/user-flow documentation support and demo checklist.

**Backend contribution (coordinated)**

- Implement or co-implement QR/parking-operation services and tests after the Booking model, QR contract, guard-to-mall authorization, and state transitions are agreed.
- Implement billing calculation/service tests after pricing and rounding rules are signed off.
- Coordinate all shared Booking model or route-index changes with Shikhar; do not independently introduce competing state fields or transitions.

**Deliverables**

- Guard operational screens and QR scan/verification journey.
- Server-side QR validation scenarios and invalid/replayed/wrong-mall tests.
- Entry/exit acceptance test matrix.
- Actual-duration billing service/UI and boundary test cases.
- Manual end-to-end regression report for all four roles.
- User-flow documentation and demo checklist.

### Responsibility summary

| Area | Driver | Collaborator / preferred reviewer |
|---|---|---|
| Backend conventions, auth, JWT and RBAC | Ocean | Shikhar |
| Shared data contracts and indexes | Shikhar | Ocean |
| Mall approval and slot APIs | Shikhar | Ocean |
| Atomic booking and cancellation | Shikhar | Ocean |
| Frontend architecture and user-facing UI | Jashan | Mehak |
| Auth and API integration in UI | Jashan | Ocean |
| QR and guard workflow | Mehak | Shikhar |
| Billing rules/service and billing UI | Mehak | Shikhar |
| Analytics APIs | Shikhar | Ocean |
| Dashboards | Jashan | Shikhar |
| Acceptance testing and demo checklist | Mehak | All |
| Final system integration | Shikhar | All |

A reviewer is not automatically a module owner. For cross-module work, the issue and PR must name one accountable author and list collaborators.

---

## 2A. Feature ownership — Feature made by

This is the single feature-to-developer ownership list for the MVP. The named person is accountable for delivering the feature, its tests, and its documentation. Where a feature crosses backend and frontend boundaries, the table explicitly identifies the owner and supporting developer so that responsibilities do not overlap.

| Feature | Made by | Supporting / integration responsibility |
|---|---|---|
| Backend project conventions and shared server patterns | Ocean | Shikhar reviews core data/business-logic impact |
| User registration API | Ocean | Jashan integrates registration UI |
| User login API | Ocean | Jashan integrates login UI |
| Password hashing and credential validation | Ocean | — |
| JWT/token creation and verification | Ocean | Jashan handles client-side session integration using the agreed contract |
| User model and role assignment rules | Ocean | Shikhar coordinates references from Mall/Booking models |
| Authentication middleware | Ocean | — |
| Role-based access control (USER, MALL_OWNER, GUARD, ADMIN) | Ocean | Jashan implements role-aware navigation; backend remains authoritative |
| Protected frontend routes and role-aware navigation | Jashan | Ocean supplies auth contract and role payload |
| Login and registration pages/forms | Jashan | Ocean supplies working auth endpoints |
| Mall submission API and Mall model | Shikhar | Ocean reviews authorization; Jashan builds owner UI |
| Mall owner: view/update own mall | Shikhar | Ocean reviews ownership checks; Jashan builds UI |
| Admin: pending mall list | Shikhar | Jashan builds admin view |
| Admin: approve/reject mall | Shikhar | Ocean reviews Admin-only authorization; Jashan builds controls |
| Mall discovery/list and mall details UI | Jashan | Shikhar supplies mall APIs |
| Parking slot model, indexes and uniqueness rules | Shikhar | Ocean reviews security/data access |
| Create/list/update/deactivate parking slots APIs | Shikhar | Jashan builds Mall Owner inventory screens |
| Parking slot management UI | Jashan | Shikhar supplies slot APIs |
| Parking availability API and slot status handling | Shikhar | Jashan integrates availability UI |
| Booking model and booking state machine | Shikhar | Mehak coordinates operational state transitions; Ocean reviews invariants |
| Create booking API | Shikhar | Jashan integrates booking flow; Ocean reviews access control |
| Atomic slot allocation / double-booking prevention | Shikhar | Ocean reviews transaction and concurrency safety; Mehak validates scenarios |
| One active booking per user enforcement | Shikhar | Ocean reviews database/auth safeguards; Mehak tests edge cases |
| Cancel eligible booking and release reserved slot | Shikhar | Jashan builds cancellation UX; Mehak validates lifecycle cases |
| User booking history/details UI | Jashan | Shikhar supplies authorized booking APIs |
| QR token generation and secure token contract | Shikhar | Mehak implements QR operational flow; Ocean reviews security |
| QR display in user's booking UI | Jashan | Mehak confirms guard scan/verification requirements |
| Guard QR scanning interface | Mehak | Jashan supports shared frontend components if needed |
| Server-side QR verification and replay/wrong-mall checks | Mehak | Shikhar integrates with Booking model/state; Ocean reviews token and authorization security |
| Guard-to-mall authorization relationship | Shikhar | Ocean enforces role/access middleware; Mehak tests guard scenarios |
| Parking entry processing and entry timestamp | Mehak | Shikhar integrates booking/slot state transitions; Ocean reviews authorization |
| Parking exit processing and exit timestamp | Mehak | Shikhar integrates booking/slot state transitions; Ocean reviews authorization |
| Booking lifecycle consistency (CONFIRMED → ACTIVE → COMPLETED / CANCELLED) | Shikhar | Mehak implements operational actions and tests; Ocean reviews security constraints |
| Slot lifecycle consistency (AVAILABLE → RESERVED → OCCUPIED → AVAILABLE) | Shikhar | Mehak validates entry/exit behavior |
| Duration calculation and bill-generation service | Mehak | Shikhar integrates it into the exit/booking workflow |
| Pricing configuration and partial-hour rounding implementation | Mehak | Shikhar agrees/stores mall pricing fields; team confirms policy before coding |
| User bill/receipt/history UI | Jashan | Mehak provides billing behavior and acceptance cases |
| Guard operations screens and feedback/error states | Mehak | Jashan supports shared UI/API integration patterns |
| Mall Owner dashboard analytics API | Shikhar | Jashan builds dashboard UI; Mehak validates totals against test data |
| Admin dashboard analytics API | Shikhar | Jashan builds dashboard UI; Mehak validates totals against test data |
| Mall Owner dashboard UI | Jashan | Shikhar supplies analytics API |
| Admin dashboard UI | Jashan | Shikhar supplies analytics API |
| API validation, common error handling and secure responses | Ocean (shared backend conventions) | Each feature owner adds feature-specific validation; Shikhar reviews booking conflicts |
| Backend unit/integration tests for auth and RBAC | Ocean | — |
| Backend tests for malls, slots, booking and concurrency | Shikhar | Ocean reviews auth-sensitive cases; Mehak adds acceptance scenarios |
| QR, entry/exit and billing test cases | Mehak | Shikhar supports backend integration tests; Ocean reviews security cases |
| Frontend component/integration tests | Jashan | Feature owners provide expected behavior and API fixtures |
| Full end-to-end regression and QA report | Mehak | All developers fix defects in their owned modules |
| API/technical documentation for auth | Ocean | — |
| API/technical documentation for malls, slots, bookings and analytics | Shikhar | — |
| Frontend setup and UI documentation | Jashan | — |
| Guard workflow, billing and demo/QA documentation | Mehak | All contribute screenshots or setup notes for their modules |
| Final backend integration and release coordination | Shikhar | Ocean security sign-off; Jashan frontend integration; Mehak QA sign-off |

**Ownership rule:** “Made by” means accountable owner, not sole contributor. Supporting members should work through linked issues/PRs and must not independently change another owner's shared models, route contracts, or state enums. If the table and a later sprint issue appear to conflict, pause and agree the owner in the issue before coding.

---

## 3. Delivery timeline and exact merge order

Use this as a **six-sprint relative plan**. A sprint is assumed to be one week, but the team should set real calendar dates after confirming the college deadline and everyone's availability. Do not interpret the sprint labels as fixed dates.

### Sprint 0 — Contracts and task breakdown (all members, 2–3 working days)

**Ocean leads** the auth contract and permission matrix.  
**Shikhar leads** entity definitions, state machines, indexes, and booking allocation design.  
**Jashan** maps the existing pages to the planned user journeys and drafts the frontend route/page inventory.  
**Mehak** converts PRD requirements into operational QA scenarios and acceptance criteria.

Before feature PRs begin, agree and document:

- User roles: `USER`, `MALL_OWNER`, `GUARD`, `ADMIN`.
- How Mall Owner and Guard accounts are provisioned; normal users must not self-assign privileged roles.
- Guard-to-mall assignment and authorization.
- User, Mall, ParkingSlot, Booking, and optional Bill fields/references.
- Mall, slot, and booking status enums and allowed transitions.
- Route list, request/response shape, error format, and status codes.
- Atomic allocation approach and transaction/rollback strategy.
- QR token generation, expiry/replay behavior, and wrong-mall rules.
- Hourly rate configuration and partial-hour rounding; PRD recommends rounding up.
- Cancellation eligibility; PRD recommends cancellation before entry.
- Billing means bill generation for MVP; online payment is future scope.

**Gate 0:** All four members approve the shared contract document and each sprint task has an Issue, owner, acceptance criteria, and dependencies.

### Sprint 1 — Authentication and application integration

**Merge order — follow this order:**

1. **Ocean merges first:** user model, registration/login APIs, password hashing, token middleware, RBAC middleware, validation, and auth tests. The auth contract must be documented in the PR.
2. **Shikhar merges second:** shared model groundwork and agreed Mall/Slot/Booking schema skeletons or contract-only groundwork that depends on the approved user contract. Keep feature logic out until the relevant sprint.
3. **Jashan builds and merges third:** API client, login/register UI, auth state/session handling, and protected-route UX using Ocean's merged request/response contract.
4. **Mehak works alongside:** role/permission test matrix, synthetic fixtures, guard workflow wireframes, and QA scenarios. These tasks do not need unfinished endpoints.

**Gate 1:** Register/login works; passwords are hashed; users cannot self-assign ADMIN; protected APIs reject missing/invalid tokens; RBAC tests pass; frontend auth integration works against the actual API.

### Sprint 2 — Mall approval and parking inventory

**Merge order:**

1. **Shikhar merges:** Mall Owner mall submission and own-mall retrieval/update; Admin pending mall list and approve/reject; slot create/list/update/deactivate APIs; indexes and validation.
2. **Ocean reviews/merges security follow-up if needed:** Admin-only approval, owner ownership checks, and approved-mall restrictions. Prefer review comments and focused PRs rather than editing Shikhar's branch.
3. **Jashan builds after the endpoint contract is merged:** mall discovery/details, owner mall-management screens, Admin approval screen, and slot-management UI.
4. **Mehak tests:** pending/rejected/approved mall cases, wrong-owner attempts, inactive slots, and role-denied operations.

**Gate 2:** Only Admin can approve/reject; owners only manage their own mall; unapproved/rejected malls cannot accept bookings; slot number uniqueness per mall is enforced; inactive slots cannot be allocated.

### Sprint 3 — Booking and atomic allocation

**Merge order:**

1. **Shikhar merges first:** booking creation, active-booking rule, atomic `AVAILABLE → RESERVED` allocation, authorized booking reads, cancellation, and slot release.
2. **Ocean reviews second:** authentication/authorization, transaction behavior, index strategy, duplicate active booking protection, and conflict responses.
3. **Jashan builds after the booking API contract is merged:** availability, booking form/confirmation, booking history/details, and cancellation UX.
4. **Mehak adds tests:** last-slot concurrency race, duplicate booking, cancellation, and lifecycle invalid-state scenarios.

**Gate 3:** Two simultaneous requests for the last slot cannot both succeed; the losing request receives 409; one user cannot create a second active booking; booking and slot state cannot be left partially inconsistent; eligible pre-entry cancellation releases the slot.

### Sprint 4 — QR, entry/exit and billing

**Merge order:**

1. **Shikhar and Ocean finalize first:** Booking/QR contract, guard-to-mall authorization, and the allowed booking/slot transitions are approved.
2. **Mehak implements:** QR verification and guard entry/exit workflow, plus billing calculation and tests in small PRs. Coordinate changes to shared booking fields with Shikhar.
3. **Shikhar integrates:** entry/exit state changes with the booking and slot lifecycle; confirm consistent writes and rollback/error behavior.
4. **Jashan integrates:** user QR display, booking state, billing details, and guard-facing screens against the merged APIs.
5. **Ocean reviews:** token security, replay/duplicate processing, guard authorization, protected routes, and sensitive data exposure.

**Gate 4:** QR is verified server-side; wrong-mall/invalid/replayed/duplicate operations are rejected; entry only works for CONFIRMED; entry records server-side time and changes booking to ACTIVE and slot to OCCUPIED; exit only works for ACTIVE; exit records time, calculates duration/bill, completes booking, and releases slot to AVAILABLE.

### Sprint 5 — Dashboards, regression and release

**Merge order:**

1. **Shikhar merges:** Mall Owner and Admin analytics APIs/aggregations with proper authorization and mall scoping.
2. **Jashan builds and merges:** owner/admin dashboards using the merged analytics contracts.
3. **Mehak completes:** end-to-end regression, billing/occupancy/revenue reconciliation, QA report, and demo checklist.
4. **Ocean completes:** security and authorization regression; fix or report any release-blocking issues.
5. **Shikhar coordinates final integration:** only after the feature PRs are merged, the full suite passes, and the team has signed off.

**Gate 5 / MVP:** all PRD MVP workflows work end to end; all critical edge cases pass; lint/build/tests pass from a clean install; README/API docs/demo setup are current; no secrets are committed.

### Dependency map

```text
Sprint 0: contracts + state machines + acceptance criteria
                         |
Sprint 1: Ocean Auth/RBAC ------ Shikhar shared data models
                         |                    |
             Jashan auth UI                    |
                         |                    |
Sprint 2: Ocean auth audit <--- Shikhar Mall + Slots
                         |                    |
             Jashan inventory UI               |
                         |                    |
Sprint 3: Jashan booking UI <-- Shikhar atomic Booking
                         |                    |
             Mehak booking/lifecycle QA         |
                         |                    |
Sprint 4: Mehak QR + Billing <-- Shikhar booking lifecycle
                         |          Ocean security review
             Jashan QR/billing UI               |
                         |                    |
Sprint 5: Jashan dashboards <-- Shikhar analytics APIs
                         |
              Mehak regression
                         |
                    MVP release
```

Only parallelize tasks whose API/schema contract and touched files are stable. If an upstream PR changes a contract, pause dependent implementation and update the issue before proceeding.

---

## 4. Git and branch workflow

### Branch strategy

Use `main` as the only long-lived shared branch. Create a short-lived branch per issue.

Branch naming:

- `feat/<issue-number>-<short-name>` — feature
- `fix/<issue-number>-<short-name>` — bug fix
- `docs/<issue-number>-<short-name>` — documentation
- `test/<issue-number>-<short-name>` — tests only
- `refactor/<issue-number>-<short-name>` — refactor
- `chore/<issue-number>-<short-name>` — tooling/configuration

Examples:

- `feat/12-auth-register-login`
- `feat/18-mall-approval-api`
- `feat/24-atomic-booking`
- `feat/31-guard-qr-entry`

Do not create shared branches named after developers. Do not push directly to `main`. Do not merge one feature branch into another as a workaround; integrate through reviewed PRs into `main`.

### Clone and local setup

```bash
git clone https://github.com/oceankumar/ParkEase.git
cd ParkEase
npm run install-all
cp client/.env.example client/.env
cp server/.env.example server/.env
```

On Windows PowerShell, use `Copy-Item client/.env.example client/.env` and `Copy-Item server/.env.example server/.env`.

Set the local environment values using the example files. Do not share or commit populated `.env` files. Start MongoDB, then run:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Health API: `http://localhost:5000/api/health`

Use Node.js 22.12 or newer, as specified by the root package metadata.

### Start every task from latest main

```bash
git switch main
git pull --ff-only origin main
git switch -c feat/<issue-number>-<short-name>
```

Before committing, inspect the exact change:

```bash
git status
git diff
git diff --check
```

### Commit message convention

Use Conventional Commit-style messages:

- `feat(auth): add register and login endpoints`
- `feat(bookings): reserve slot atomically`
- `fix(qr): reject replayed entry scans`
- `test(bookings): cover concurrent allocation`
- `docs(api): document mall approval endpoints`
- `refactor(server): centralize request validation`
- `chore(deps): update approved dependency`

Rules:

- One logical change per commit.
- Avoid vague messages such as `changes`, `final`, `updated code`, or `fixes`.
- Do not commit build output, local logs, secrets, or unrelated formatting changes.
- Do not rewrite shared history or force-push to `main`.

### Keep your branch current

Before opening a PR and again before merge:

```bash
git fetch origin
git rebase origin/main
```

If a rebase conflict occurs:

1. Stop and inspect the conflicting files.
2. Resolve only files you understand and own.
3. Ask the owner before resolving conflicts in shared contracts, models, route indexes, package files, or app wiring.
4. Run lint/build/tests after resolving.
5. Never blindly choose `ours` or `theirs`.

If the team chooses merge commits instead of rebasing, record that decision and apply it consistently. Do not mix history strategies casually.

### Push and open PR

```bash
git push -u origin feat/<issue-number>-<short-name>
```

Open a PR from your feature branch into `main`. Use a **Draft PR** while implementation is incomplete. Mark it ready only when the PR checklist is satisfied.

---

## 5. Mandatory Pull Request standard

### PR title format

`<type>(<scope>): <imperative summary>`

Examples:

- `feat(auth): add JWT authentication and role middleware`
- `feat(malls): implement owner mall submission and admin approval`
- `feat(bookings): prevent concurrent double allocation`
- `test(operations): cover QR entry and exit edge cases`

### Copy/paste PR description template

```markdown
## Summary
<!-- What does this PR change? Keep it focused. -->

## Related issue
Closes #<issue-number>

## Owner
<!-- Ocean / Shikhar / Jashan / Mehak -->

## Scope
- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Tests
- [ ] Documentation

## API or data-model changes
<!-- Routes, request/response shape, model fields, indexes, state transitions.
     Write "None" if not applicable. -->

## Implementation notes
<!-- Explain important decisions, transaction/authorization behavior, etc. -->

## Verification
- [ ] npm run lint
- [ ] npm run build
- [ ] npm test
- [ ] Relevant manual/API tests completed
- [ ] Success and failure edge cases tested
- [ ] No secrets or .env files included

## Screenshots / request-response examples
<!-- Add UI screenshots or sanitized API examples where applicable. -->

## Risks / follow-up
<!-- Migration, compatibility, known limitations, or "None". -->

## Reviewer checklist
- [ ] Scope is focused and matches the issue
- [ ] Authorization and ownership checks are server-side
- [ ] Validation and correct HTTP status codes are used
- [ ] Tests cover success and failure paths
- [ ] Documentation is updated
```

### PR size and scope rules

- Keep PRs small enough to review carefully; aim for under approximately 400 changed lines, excluding generated files, lockfiles, and unavoidable snapshots.
- If a feature is larger, split it into contract/schema, service/API, and UI/integration PRs.
- One PR should solve one issue or one tightly related set of acceptance criteria.
- Do not bundle unrelated refactors, dependency upgrades, or formatting sweeps into a feature PR.
- If a PR changes a shared API contract, model field, enum, state transition, root package file, or environment configuration, call it out explicitly and request the relevant owner.

### Review and approval policy

- Every PR requires **at least one approval from a teammate other than the author**.
- High-risk or cross-module PRs should receive two reviews where practical, ideally the relevant backend owner plus another teammate.
- Preferred review ownership:
  - Ocean: auth, RBAC, token security, authorization.
  - Shikhar: inventory, booking, data consistency, analytics APIs.
  - Jashan: frontend architecture, UI, API integration.
  - Mehak: QR, guard operations, billing behavior, acceptance scenarios.
- The PR author cannot approve their own PR.
- Reviewers should aim to respond within one working day. Authors must respond to comments and resolve threads only after fixing the issue or agreeing on a documented explanation.
- Do not merge with unresolved blocking comments or failing required checks.

### Merge policy

- PR target is always `main`.
- Prefer **Squash and merge** so each PR becomes one focused commit in `main`, unless repository settings/team agreement require another method.
- The PR author should not merge their own PR; the designated reviewer or integration owner merges after approval and green checks.
- Delete the feature branch after merge.
- After a merge, teammates update local `main` before starting dependent work.

---

## 6. Definition of Ready and Definition of Done

### Definition of Ready — before coding

- [ ] Issue exists and has one accountable owner.
- [ ] Acceptance criteria are testable.
- [ ] Dependencies and required API/model contracts are identified.
- [ ] Shared files likely to change are listed.
- [ ] UI/API behavior is clear enough to implement.
- [ ] Product decisions are resolved or explicitly marked as blockers.

### Definition of Done — before merge

- [ ] Acceptance criteria pass.
- [ ] Relevant tests are added/updated and pass.
- [ ] Lint, build, and tests pass locally.
- [ ] API docs/README are updated where necessary.
- [ ] Required review approval is recorded.
- [ ] No blocking review comments remain.
- [ ] No secrets or unrelated changes are present.
- [ ] The implementation is integrated with current `main`, not merely working on the author's machine.

---

## 7. Shared-file and API-contract coordination

High-conflict areas include:

- `server/src/app.js`, `server/src/server.js`, and route index files.
- `server/src/models/*` and shared constants/enums.
- Shared middleware, error format, validators, and service helpers.
- Root `package.json`, root `package-lock.json`, and workspace config.
- Frontend route registry, central API client, and app-level auth state.

Rules:

1. Before editing a shared file, announce the intended change in the team's agreed channel and reference the issue.
2. One person owns a shared-file change per PR. Others contribute through review or a separate PR.
3. Do not rename API paths, status enums, model properties, or error fields without a contract-change issue and team approval.
4. Add feature route modules separately and coordinate route-index registration; avoid multiple simultaneous edits to the same index file.
5. Do not run `npm install` concurrently in multiple branches and create competing lockfile changes. Coordinate dependency changes through one PR owner from the repository root.
6. A model owner must notify dependent service/UI owners before changing required fields or status names.
7. Avoid circular imports and cross-module direct database access. Routes wire middleware/controllers; controllers handle HTTP; services own business rules and database operations.

### Contract-change procedure

1. Open an issue titled `contract: <resource/change>`.
2. Document old/new routes, fields, status values, sample requests/responses, migration/backward compatibility, and affected modules.
3. Get approval from Ocean and Shikhar plus any affected owner.
4. Merge the contract change before dependent implementations, or use explicitly linked and coordinated PRs.
5. Update API docs and test fixtures in the same PR or a linked follow-up issue.

---

## 8. Backend implementation conventions

Follow the existing repository structure. Do not introduce a new architecture without team agreement.

```text
server/src/
  config/
  constants/
  controllers/
  middleware/
  models/
  routes/
  services/
  utils/
```

Responsibilities:

- **Routes:** URL, HTTP method, and middleware wiring.
- **Middleware:** authentication, role checks, and common request handling.
- **Controllers:** HTTP input/output and status codes; keep business logic out.
- **Services:** business rules, state transitions, and database operations.
- **Models:** schemas, indexes, and schema-level constraints.
- **Utils:** reusable stateless helpers.

API conventions:

- Keep API routes under `/api`.
- Use plural resource paths where possible.
- Keep JSON success/error structures consistent.
- Use 400 for invalid input, 401 for unauthenticated/invalid credentials, 403 for insufficient permission, 404 for missing resources, 409 for conflicts/state violations, and 500 for unexpected server/database failures.
- Never trust client-supplied `userId`, `ownerId`, role, amount, slot state, entry time, or exit time where these must be derived from authenticated identity or server state.
- Validate IDs, enums, dates, and numeric limits.
- Enforce role and owner/mall scope on the backend. CORS and frontend route guards are not authorization.

### Booking invariants — do not weaken these

- Slot lifecycle: `AVAILABLE → RESERVED → OCCUPIED → AVAILABLE`.
- Eligible pre-entry cancellation releases `RESERVED → AVAILABLE`.
- Booking lifecycle: `CONFIRMED → ACTIVE → COMPLETED`, or `CONFIRMED → CANCELLED`.
- A user may have only one active booking; the PRD defines `CONFIRMED` and `ACTIVE` as active.
- Slot allocation must be atomic. A read-then-write availability check by itself is not sufficient.
- Booking creation and slot reservation must not leave inconsistent partial state.
- QR checks must validate the booking, mall, status, guard authorization, and replay/duplicate processing server-side.
- Exit is allowed only for ACTIVE; duration uses server-recorded entry/exit timestamps; completion releases the slot.
- Use 409 for duplicate active-booking attempts, unavailable-slot races, and invalid state conflicts.

MongoDB transaction availability depends on deployment topology. Verify that local and target MongoDB environments support transactions before relying on them. Use atomic single-document updates as a foundation and document rollback/compensation behavior for multi-document operations.

---

## 9. Testing requirements

At minimum, add tests for the following areas as their features are implemented.

### Identity and authorization

- Duplicate registration and invalid credentials.
- Password is not returned or stored in plaintext.
- Missing, malformed, invalid, and expired token.
- User cannot self-assign ADMIN or another privileged role.
- Protected endpoints have allowed-role and denied-role tests.

### Mall and slots

- Mall starts as PENDING.
- Only Admin can approve/reject.
- Owner cannot edit or manage another owner's mall.
- Unapproved/rejected mall is not bookable.
- Duplicate slot number within one mall is rejected.
- INACTIVE slot cannot be allocated.

### Booking

- Successful booking reserves one AVAILABLE slot.
- No available slot returns 409.
- Two users racing for the final slot: exactly one succeeds.
- User with CONFIRMED or ACTIVE booking cannot book again.
- Eligible cancellation releases the reserved slot.
- Cancellation after entry is rejected.
- Database failure does not leave a booking/slot inconsistency.

### QR, entry, exit, and billing

- Invalid/unknown QR is rejected.
- QR used at the wrong mall or by an unauthorized guard is rejected.
- Duplicate entry and duplicate exit are rejected.
- Exit before entry is rejected.
- Completed/cancelled booking cannot re-enter.
- Entry/exit timestamps, duration, and bill are correct.
- Hourly-rate and partial-hour rounding boundaries are tested.
- Completed booking releases the occupied slot.

### Analytics and UI

- Owner analytics include only that owner's mall.
- Admin analytics are platform-wide.
- Empty, loading, and error UI states render correctly.
- Critical journeys are checked at desktop and mobile sizes.

The existing baseline command is `npm test`; run the full command after backend integration. Add dedicated test scripts only by team agreement.

---

## 10. Team communication and daily workflow

Post one short async update in the team's agreed channel on each working day:

```text
Yesterday:
- ...

Today:
- ...

Blocked by:
- ...

PR / Issue:
- ...
```

Before starting overlapping work:

- Check open issues and PRs.
- Check module and shared-file ownership.
- Confirm the API contract.
- Notify the owner before changing a shared file.

When blocked:

1. Comment on the issue with the exact blocker and what has been tried.
2. Tag the dependency owner.
3. Do not silently create a parallel implementation or invent a different contract.
4. Pick up an independent task if the dependency prevents progress.

Suggested weekly cadence:

- **Planning:** assign owner, acceptance criteria, dependencies, and sprint dates.
- **Mid-sprint check:** identify integration blockers and review open PRs.
- **Sprint review:** demo merged functionality, not code that only exists on a feature branch.
- **Retrospective:** record one process improvement for the next sprint.

---

## 11. GitHub Issues, labels, and milestones

Create one issue for each independently testable deliverable.

### Issue template

```markdown
## Goal
What needs to be implemented?

## Owner
Ocean / Shikhar / Jashan / Mehak

## User story
As a <role>, I want <capability>, so that <outcome>.

## Acceptance criteria
- [ ] Given ..., when ..., then ...
- [ ] Failure/permission case ...
- [ ] Tests added ...

## API / UI / data contract
Routes, fields, states, screenshots, or link to the approved contract.

## Dependencies
Related issues and required merged PRs.

## Files/modules likely affected
List shared files explicitly.

## Out of scope
What this issue must not include.
```

### Suggested labels

- Type: `feature`, `bug`, `docs`, `testing`, `refactor`, `chore`
- Area: `area:auth`, `area:backend`, `area:frontend`, `area:database`, `area:booking`, `area:operations`, `area:analytics`
- Workflow: `blocked`, `needs-contract`, `ready`, `in-progress`, `needs-review`

### Suggested milestones

- `Sprint 0 — Contracts`
- `Sprint 1 — Identity`
- `Sprint 2 — Inventory`
- `Sprint 3 — Booking`
- `Sprint 4 — Operations`
- `Sprint 5 — Release`

Create the labels and milestones in GitHub before using them. Assign one owner to each issue; collaborators can be mentioned in the issue body.

---

## 12. Repository settings to enable

A repository owner/maintainer should configure these settings in GitHub. The current connected GitHub integration could read the public repository but did not have permission to write repository contents, so these settings and file additions must be performed by a maintainer.

- Protect `main` with a branch ruleset or branch protection rule.
- Require a pull request before merging.
- Require at least one approving review.
- Dismiss stale approvals when new commits are pushed.
- Require conversation resolution before merging.
- Require CI status checks after the workflow is added.
- Block force pushes and deletion of `main`.
- Restrict direct pushes to `main`.
- Prefer squash merging; disable other merge methods if the team agrees.
- Add GitHub Actions CI for install, lint, frontend build, and backend tests.
- Add `CODEOWNERS` only after confirming each member's exact GitHub username. Do not guess usernames from display names.

Suggested initial CI command sequence:

```bash
npm ci
npm run lint
npm run build
npm test
```

If the repository plan/settings do not support a particular protection feature, follow the rule as a team process and do not claim it is technically enforced.

---

## 13. Security and data hygiene

- Commit `.env.example`, never populated `.env` files.
- Do not share MongoDB credentials or JWT secrets in chat, issues, screenshots, or logs.
- Rotate any credential accidentally committed; deleting it in a later commit is not enough.
- Use fake test accounts and synthetic mall/booking data.
- Never return password hashes, raw QR secrets, or internal stack traces in API responses.
- Do not log Authorization headers, passwords, raw secrets, or full QR tokens.
- Enforce server-side role and ownership checks on every sensitive action.
- Do not treat CORS or frontend route guards as authentication/authorization.
- Keep dependencies minimal and discuss new packages before adding them.

---

## 14. MVP scope guard

The PRD MVP includes authentication, RBAC, mall submission and approval, parking slot management, atomic allocation, one active booking per user, QR verification, entry/exit, booking states, duration-based bill generation, Mall Owner/Admin dashboards, validation, error handling, and MongoDB persistence.

The PRD places these in future scope unless the team formally changes the scope: online payment gateway, push/SMS notifications, AI-based prediction, dynamic pricing, license plate recognition, navigation, and reservation sharing. Do not allow future-scope features to displace the core MVP acceptance criteria.

---

## 15. Release checklist

- [ ] Sprint 0 decisions and API contracts are recorded.
- [ ] All MVP issues are closed or explicitly documented as accepted limitations.
- [ ] Four roles and backend RBAC are verified.
- [ ] Mall approval and ownership restrictions are verified.
- [ ] Slot CRUD, uniqueness, and indexes are verified.
- [ ] Concurrent allocation test passes.
- [ ] One-active-booking rule passes.
- [ ] QR validation, replay, and wrong-mall cases pass.
- [ ] Entry/exit and slot lifecycle pass.
- [ ] Billing duration and rounding pass.
- [ ] Owner and Admin analytics are correctly scoped.
- [ ] `npm ci`, `npm run lint`, `npm run build`, and `npm test` pass.
- [ ] No secrets or real personal data are committed.
- [ ] README, API examples, environment setup, and demo steps are current.
- [ ] `main` contains reviewed, integrated work only.

---

## 16. Team agreement

By contributing to ParkEase, each member agrees to:

- Work from an assigned issue and an approved contract.
- Use a feature branch and PR for every change.
- Review teammates' code constructively and respond to feedback.
- Avoid unannounced edits to shared files and contracts.
- Keep `main` stable and runnable.
- Test their own work and document how it was verified.
- Raise blockers early instead of creating conflicting implementations.

**The goal is one integrated product, not four disconnected codebases.**
