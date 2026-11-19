import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import QRToken from "../models/QRToken.js";
import { migrationPlan } from "../services/bookingMigration.js";
import { databaseNameFromUri } from "../config/env.js";

const apply = process.argv.includes("--apply");
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
const databaseName = databaseNameFromUri(process.env.MONGODB_URI);
const confirmation = process.argv.find((value) => value.startsWith("--confirm-database="))?.split("=")[1];
if (apply && confirmation !== databaseName) {
  throw new Error(`Apply requires --confirm-database=${databaseName}`);
}
await mongoose.connect(process.env.MONGODB_URI);
const hello = await mongoose.connection.db.admin().command({ hello: 1 });
if (!hello.setName && hello.msg !== "isdbgrid") throw new Error("A transaction-capable MongoDB deployment is required");
const counts = { scanned: 0, backfill: 0, expire: 0, inconsistent: [] };
try {
  for await (const booking of Booking.find({}).cursor()) {
    counts.scanned++;
    const plan = migrationPlan(booking);
    if (plan.problems.length) {
      counts.inconsistent.push({ bookingId: String(booking._id), codes: plan.problems });
      continue;
    }
    if (!plan.changes) continue;
    if (plan.changes.entryDeadline) counts.backfill++;
    if (plan.changes.status === "EXPIRED") counts.expire++;
    if (!apply) continue;
    await mongoose.connection.transaction(async (session) => {
      const current = await Booking.findById(booking._id).session(session);
      if (!current) return;
      const currentPlan = migrationPlan(current);
      if (currentPlan.problems.length) throw new Error(`Booking ${booking._id} changed to an inconsistent state`);
      if (!currentPlan.changes) return;
      current.set(currentPlan.changes);
      await current.save({ session });
      if (currentPlan.changes.status === "EXPIRED") await QRToken.updateMany(
        { bookingId: current._id, status: "ACTIVE" }, { $set: { status: "REVOKED" } }, { session });
    });
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", databaseName, ...counts }));
  if (apply && counts.inconsistent.length) process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
