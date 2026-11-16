# ParkEase — Development Guidelines & Conventions (`docs/DEVELOPMENT_GUIDELINES.md`)

> **Document Status:** Milestone 0 Engineering Standards (Finalized)
> **Scope:** Solo Developer Workflow, Naming Conventions, Layer Responsibilities, Cookie/CSRF Security, Error Handling, Validation, Replica-Set Setup, Logging, and Testing

---

## 1. Guiding Principles for Solo Development

ParkEase was initially scaffolded with a 4-person team template (`CONTRIBUTING.md`), and is now developed independently. These guidelines streamline the workflow so that solo development remains disciplined, low-friction, and production-grade without unnecessary ceremony:
1. **Contract-First Execution:** Implement each milestone according to `docs/DATABASE_DESIGN.md` and `docs/API_CONTRACTS.md`.
2. **Preserve Existing Architecture:** Keep the npm workspace structure (`client` and `server`), plain JavaScript ES modules (`"type": "module"`), Express 5, Mongoose 8, React 19, and Node's built-in test runner (`node:test`).
3. **Avoid Enterprise Bloat:** Do not introduce TypeScript migrations, Redux, class-based dependency injection containers, or heavy ORM abstractions. Keep functions pure, direct, and easy to trace.

---

## 2. File & Folder Naming Conventions

### 2.1 Backend (`server/src/`)
| Directory | Naming Convention | Examples |
| :--- | :--- | :--- |
| `config/` | `camelCase.js` | `db.js`, `env.js` |
| `constants/` | `camelCase.js` (exports `UPPER_SNAKE_CASE` objects) | `roles.js`, `statuses.js` |
| `models/` | `PascalCase.js` (singular entity name) | `User.js`, `Mall.js`, `ParkingSlot.js`, `Booking.js`, `GuardAssignment.js`, `RefreshToken.js`, `QRToken.js` |
| `routes/` | `<resource>Routes.js` + `index.js` | `healthRoutes.js`, `authRoutes.js`, `mallRoutes.js`, `bookingRoutes.js`, `adminRoutes.js` |
| `controllers/` | `<resource>Controller.js` (exports named verbs) | `healthController.js`, `authController.js`, `mallController.js` |
| `services/` | `<resource>Service.js` (exports named domain functions) | `authService.js`, `mallService.js`, `bookingService.js`, `qrService.js`, `billingService.js` |
| `middleware/` | `camelCase.js` | `errorHandler.js`, `notFound.js`, `authMiddleware.js`, `csrfMiddleware.js`, `rateLimiter.js` |
| `utils/` | `camelCase.js` (or `PascalCase.js` for error classes) | `AppError.js`, `jwt.js`, `cookies.js`, `password.js`, `validators.js` |
| `scripts/` | `camelCase.js` | `seedAdmin.js` |
| `server/test/` | `<feature>.test.js` | `app.test.js`, `auth-utils.test.js`, `auth.test.js`, `booking.test.js` |

### 2.2 Frontend (`client/src/`)
| Directory | Naming Convention | Examples |
| :--- | :--- | :--- |
| `components/` | `PascalCase.jsx` | `Navbar.jsx`, `Footer.jsx`, `FeatureCard.jsx`, `PageContainer.jsx`, `ProtectedRoute.jsx` |
| `pages/` | `<Name>Page.jsx` (grouped by role subfolder as pages grow) | `HomePage.jsx`, `LoginPage.jsx`, `RegisterPage.jsx`, `DashboardPage.jsx`, `NotFoundPage.jsx` |
| `context/` | `<Name>Context.jsx` | `AuthContext.jsx` |
| `hooks/` | `use<Name>.js` | `useAuth.js` |
| `services/` | `<resource>Service.js` (`api.js` as core HTTP client) | `api.js`, `authService.js`, `mallService.js`, `bookingService.js` |
| `utils/` | `camelCase.js` | `constants.js`, `formatters.js` |

---

## 3. Layer Responsibilities (Backend)

### 3.1 Routes (`server/src/routes/`)
- Mounts HTTP verbs (`GET`, `POST`, `PATCH`, `DELETE`) onto an Express `Router()`.
- Chains authentication, RBAC (`authorize`), CSRF origin/header verification (`verifyCsrfProtection`), and rate-limiting middleware before the controller function.
- **Never** contains inline route handler callbacks with business logic.

### 3.2 Controllers (`server/src/controllers/`)
- Reads HTTP inputs (`req.params`, `req.query`, `req.body`, `req.user`, `req.headers.cookie`, `req.ip`).
- Calls the appropriate `Service` function.
- Manages HTTP-specific transport concerns such as setting or clearing the `HttpOnly` refresh token cookie (`setRefreshCookie` / `clearRefreshCookie`).
- Formats and sends the HTTP response (`res.status(code).json({ success: true, message, data })`).
- **Rely on Express 5 automatic async error forwarding:** All async controller functions simply `await` service calls and allow thrown `AppError` instances to propagate to `errorHandler.js` without repetitive `try/catch` boilerplate.

### 3.3 Services (`server/src/services/`)
- Owns all business rules, state transition validations, Mongoose transactions (`session.withTransaction()`), conditional atomic updates (`findOneAndUpdate`), and Mongoose queries.
- Throws `new AppError(status, message, code, details)` when a domain rule, permission check, or state constraint is violated.
- **Never** accesses Express `req` or `res` objects directly.

### 3.4 Models (`server/src/models/`)
- Defines Mongoose schemas, field constraints, enums, and compound/partial indexes.
- Model names use singular `PascalCase`: `mongoose.model("User", userSchema)`, `mongoose.model("ParkingSlot", parkingSlotSchema)`.

---

## 4. Token, Cookie & CSRF Conventions

1. **No Token Storage in `localStorage` or `sessionStorage`:**
   - The frontend must store `accessToken` **only in React memory** (`AuthContext` / module variable in `client/src/services/api.js`).
   - The refresh token is an opaque 32-byte random value stored **only in an `HttpOnly` cookie** (`parkease_refresh_token`) managed by the server, and stored in MongoDB only as a SHA-256 hash (`tokenHash`).
2. **Consistent Cookie & Database Refresh Expiry (`server/src/utils/cookies.js`):**
   - Always use `getRefreshTokenTtlMs()` and `getRefreshTokenExpiryDate()` so the cookie `maxAge` and the `RefreshToken.expiresAt` field in MongoDB use a single 7-day (`JWT_REFRESH_EXPIRES_IN`) configuration source.
   - Always set `httpOnly: true`, `path: "/api/auth"`, `maxAge: getRefreshTokenTtlMs()`.
   - In development/test (`process.env.NODE_ENV !== "production"`): `secure: false`, `sameSite: "lax"`.
   - In production (`process.env.NODE_ENV === "production"`): `secure: true`, `sameSite: "strict"` (or `sameSite: "none"` if frontend and backend are deployed cross-site on separate domains).
3. **Database-Backed Authentication Middleware:**
   - `authenticate` verifies the JWT, reads `decoded.sub`, loads the current `User` from MongoDB, verifies live account `status` and `role`, and attaches the database-backed identity to `req.user`.
4. **CSRF Protection on Cookie-Authenticated Endpoints:**
   - `POST /api/auth/refresh` and `POST /api/auth/logout` must validate:
     - `req.headers.origin` (when present) matches `process.env.CLIENT_URL || "http://localhost:5173"`.
     - `req.headers["x-requested-with"] === "XMLHttpRequest"`.

---

## 5. Error Handling Convention

### 5.1 Operational Errors (`AppError`)
`server/src/utils/AppError.js`:
```js
export default class AppError extends Error {
  constructor(status, message, code = "APP_ERROR", details = undefined) {
    super(message);
    this.name = "AppError";
    this.status =
      Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}
```

### 5.2 Centralized Error Handler (`server/src/middleware/errorHandler.js`)
The error handler follows these rules so existing tests in `server/test/app.test.js` continue to pass while supporting operational domain errors:
1. **Headers Already Sent:** `if (res.headersSent) return next(err);`
2. **Malformed JSON (`SyntaxError` from `express.json()`):** When `err.status === 400 && !err.isOperational`, return `400` with `{ success: false, message: "Invalid request body" }`.
3. **Payload Too Large (`413` from `express.json()`):** Return `413` with `{ success: false, message: "Request body too large" }`.
4. **Operational Errors (`err.isOperational === true`):** Return `err.status` (`400..499`) with `{ success: false, message: err.message, ...(err.code || err.details !== undefined ? { error: ... } : {}) }`.
5. **Unexpected / Programming Errors (`500`):** Never leak `err.message` or stack trace to the client. Always return `500` with `{ success: false, message: "Something went wrong" }`.

---

## 6. Input Validation Convention

- Use focused, reusable validator helpers in `server/src/utils/validators.js`:
  - Validate `validateObjectId(id, fieldName)` on all `:id` route parameters before querying MongoDB.
  - Normalize and trim strings (`validateEmail(email)`, `slotNumber.trim().toUpperCase()`, `vehicleNumber.trim().toUpperCase()`).
  - Explicitly whitelist allowed fields from `req.body` (never pass raw `req.body` directly into `Model.create(req.body)` or `Model.findByIdAndUpdate(id, req.body)`).

---

## 7. Environment Variables & Local MongoDB Replica Set Configuration

### 7.1 Backend (`server/.env` & `server/.env.example`)
All backend secrets and runtime settings live in `server/.env`:
```dotenv
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/parkease
CLIENT_URL=http://localhost:5173
JWT_ACCESS_SECRET=replace-with-a-random-32-byte-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=10
ADMIN_NAME=ParkEase Admin
ADMIN_EMAIL=admin@parkease.local
ADMIN_PASSWORD=replace-with-a-strong-password
```
- `JWT_ACCESS_SECRET` must be at least 32 bytes and not a placeholder value.
- Never print raw environment values in console logs or error messages.

### 7.2 Local Single-Node MongoDB Replica Set Setup
Booking, slot reservation, and QR token creation use Mongoose multi-document ACID transactions (`session.withTransaction()`), which require a MongoDB replica set (or MongoDB Atlas). To run a local single-node replica set (`rs0`):
```bash
mongod --replSet rs0 --dbpath /usr/local/var/mongodb --bind_ip 127.0.0.1 --port 27017
mongosh --eval 'rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "127.0.0.1:27017" }] })'
```
Then set `MONGODB_URI=mongodb://127.0.0.1:27017/parkease?replicaSet=rs0` in `server/.env`.

### 7.3 Frontend (`client/.env` & `client/.env.example`)
```dotenv
VITE_API_URL=http://localhost:5173/api
```
*(Default in `client/.env.example`: `VITE_API_URL=http://localhost:5000/api`.)*
- **Strict Rule:** `VITE_*` variables are bundled into public browser JavaScript. Never place any secret or private key in `client/.env`.

---

## 8. Logging Standards

- Keep logging clean and structured using standard `console.info`, `console.warn`, and `console.error`.
- **Redaction Rule:** Never log:
  - `MONGODB_URI` or database connection strings containing credentials.
  - `req.headers.authorization`, `req.headers.cookie`, `Set-Cookie` headers, `JWT_ACCESS_SECRET`, or raw JWT / Refresh / QR tokens.
  - Plaintext passwords (`password`, `ADMIN_PASSWORD`) or `passwordHash` values.

---

## 9. Testing Standards

- **Test Runner:** Node.js built-in test runner (`node --test` via `npm test`).
- **Assertions:** `node:assert/strict`.
- **HTTP Testing Pattern:** Start `app.listen(0, "127.0.0.1")` on an ephemeral port and make real HTTP calls using Node's global `fetch()`, closing the server in a `finally` block.
- **Transactional Concurrency Tests:** When testing booking allocation (Milestone 3), explicitly test:
  - `Promise.all()` concurrent requests racing for a single `AVAILABLE` slot inside replica-set transactions (exactly one `201 Created`, others `409 Conflict`).
  - `Promise.all()` concurrent requests from a single user attempting to create two active bookings (enforced by `unique_active_booking_per_user` partial unique index and transaction rollback).
- **Lint & Build Gate:** Before every commit, run from the repository root:
  ```bash
  npm test
  npm run lint
  npm run build
  ```
- **ESLint Rule Reminder:** `eslint.config.mjs` enforces `"no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z]" }]`. Do not leave unused lowercase variables or parameters.

---

## 10. Practical Git Workflow (Solo Developer)

### 10.1 Branching Strategy
- `main` is the stable, runnable branch where every commit passes `npm test`, `npm run lint`, and `npm run build`.
- Develop each milestone or feature slice on a focused branch:
  - `feat/m1-auth-rbac`
  - `feat/m2-malls-and-slots`
  - `feat/m3-atomic-bookings`
  - `feat/m4-qr-entry-exit-billing`
  - `feat/m5-dashboards-analytics`

### 10.2 Commit Convention (Conventional Commits)
Format: `<type>(<scope>): <imperative summary>`
- `docs(arch): finalize Milestone 0 architecture and replica-set transaction specs`
- `feat(auth): implement user model, JWT auth, HttpOnly refresh cookie, and RBAC`
- `feat(malls): add mall submission, admin approval, and slot inventory APIs`
- `feat(bookings): implement transactional slot allocation and partial unique indexes`
- `test(auth): add integration tests for registration, cookie rotation, and role guards`
