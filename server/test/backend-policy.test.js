import test from "node:test";
import assert from "node:assert/strict";
import { analyticsRange } from "../src/services/analyticsDateRange.js";
import { migrationPlan } from "../src/services/bookingMigration.js";
import { assertRequiredIndexes, assertTransactionSupport } from "../src/services/indexReadiness.js";
import { overlappingBookings, liveConfirmedBookings } from "../src/utils/bookingWindow.js";
import { databaseNameFromUri, serverEnvPath } from "../src/config/env.js";
import { runExpirySweep, startExpiryWorker, stopExpiryWorker, workerStatus } from "../src/services/expiryService.js";

const date = new Date("2026-11-19T18:29:00.000Z");
test("IST date bounds are inclusive dates and half-open UTC intervals", () => {
  const { start, end } = analyticsRange({ from: "2026-11-19", to: "2026-11-20" }, date);
  assert.equal(start.toISOString(), "2026-11-18T18:30:00.000Z");
  assert.equal(end.toISOString(), "2026-11-20T18:30:00.000Z");
  assert.throws(() => analyticsRange({ from: "2026-02-30", to: "2026-03-01" }, date));
  assert.throws(() => analyticsRange({ from: ["2026-11-19"], to: "2026-11-20" }, date));
  assert.throws(() => analyticsRange({ from: "2026-01-01", to: "2026-11-20" }, date));
});
test("migration preserves historical completed visits and reports inconsistent records", () => {
  const past = { status: "CONFIRMED", startTime: new Date("2026-11-18T10:00:00Z"),
    endTime: new Date("2026-11-18T11:00:00Z") };
  assert.equal(migrationPlan(past, date).changes.status, "EXPIRED");
  assert.equal(migrationPlan(past, date).changes.expiredAt.toISOString(), "2026-11-18T10:15:00.000Z");
  assert.equal(migrationPlan({ ...past, status: "EXPIRED", expiredAt: date }, date).changes, null);
  assert.deepEqual(migrationPlan({ ...past, entryTime: date }, date).problems, ["CONFIRMED_HAS_ENTRY"]);
  const completed = { ...past, status: "COMPLETED", entryTime: new Date("2026-11-18T10:00:00Z"),
    exitTime: new Date("2026-11-18T11:00:00Z") };
  assert.deepEqual(migrationPlan(completed).problems, ["COMPLETED_BILL_UNVERIFIED"]);
  assert.equal(migrationPlan({ ...completed, billingStatus: "GENERATED" }).changes, null);
});
test("overlap eligibility uses logical deadline even when worker is delayed", () => {
  const window = { startTime: new Date("2026-11-19T18:00:00Z"),
    endTime: new Date("2026-11-19T19:00:00Z") };
  const query = overlappingBookings("mall", window, date);
  assert.equal(query.$or[0].$or[0].entryDeadline.$gt, date);
  assert.deepEqual(query.$or[0].$or[1].entryDeadline, null);
  assert.equal(query.$or[1].status, "ACTIVE");
  assert.equal(liveConfirmedBookings(date).status, "CONFIRMED");
});
test("readiness requires replica-set support and exact index definitions", async () => {
  assert.throws(() => assertTransactionSupport({ maxWireVersion: 17 }));
  assert.throws(() => assertTransactionSupport({ setName: "rs0", maxWireVersion: 7 }));
  assert.doesNotThrow(() => assertTransactionSupport({ setName: "rs0", maxWireVersion: 17 }));
  const model = { modelName: "Example", schema: { indexes: () => [[{ status: 1 },
    { unique: true, partialFilterExpression: { status: "ACTIVE" } }]] }, collection: {
    indexes: async () => [{ key: { _id: 1 } }, { key: { status: 1 }, unique: true,
      partialFilterExpression: { status: "ACTIVE" } }],
  } };
  await assertRequiredIndexes([model]);
  model.collection.indexes = async () => [{ key: { status: 1 }, unique: false }];
  await assert.rejects(assertRequiredIndexes([model]));
});
test("server environment path and migration database confirmation are explicit", () => {
  assert.match(serverEnvPath, /server\/\.env$/);
  assert.equal(databaseNameFromUri("mongodb://127.0.0.1:27017/parkease_migration_test?replicaSet=rs0"),
    "parkease_migration_test");
  assert.throws(() => databaseNameFromUri("mongodb://127.0.0.1:27017/?replicaSet=rs0"));
  assert.throws(() => databaseNameFromUri("mongodb://127.0.0.1:27017/admin?replicaSet=rs0"));
});
test("expiry shutdown waits for an in-flight sweep before returning", async () => {
  let release;
  let stopped = false;
  const work = runExpirySweep(() => new Promise((resolve) => { release = resolve; }));
  const stopping = stopExpiryWorker().then(() => { stopped = true; });
  await Promise.resolve();
  assert.equal(workerStatus().running, true);
  assert.equal(stopped, false);
  release({ examined: 1, expired: 1, failed: 0 });
  assert.deepEqual(await work, { examined: 1, expired: 1, failed: 0 });
  await stopping;
  assert.equal(stopped, true);
  assert.equal(workerStatus().running, false);
  // Restore reusable module state for any later test in this process.
  startExpiryWorker();
  await stopExpiryWorker();
});
