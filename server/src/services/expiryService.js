import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import QRToken from "../models/QRToken.js";

export async function expireBooking(id, now = new Date()) {
  return mongoose.connection.transaction(async (session) => {
    const booking = await Booking.findOne({ _id: id, status: "CONFIRMED", entryDeadline: { $lte: now } }).session(session);
    if (!booking) return false;
    booking.status = "EXPIRED";
    booking.expiredAt = booking.entryDeadline;
    booking.billingStatus = "WAIVED";
    await booking.save({ session });
    await QRToken.updateMany({ bookingId: id, status: "ACTIVE" }, { $set: { status: "REVOKED" } }, { session });
    return true;
  });
}

export async function sweepExpired(now = new Date(), limit = 100) {
  const due = await Booking.find({ status: "CONFIRMED", entryDeadline: { $lte: now } })
    .select("_id").sort({ entryDeadline: 1, _id: 1 }).limit(limit).lean();
  let expired = 0;
  let failed = 0;
  for (const { _id } of due) {
    try { if (await expireBooking(_id, now)) expired++; }
    catch { failed++; console.error("Booking expiry failed; retrying next sweep"); }
  }
  return { examined: due.length, expired, failed };
}

let timer;
let activeRun = null;
let stopping = false;
let lastRunAt = null;
let lastResult = null;
export function workerStatus() { return { running: Boolean(activeRun), started: Boolean(timer), stopping, lastRunAt, lastResult }; }
export function runExpirySweep(sweep = sweepExpired) {
  if (stopping) return activeRun ?? Promise.resolve(null);
  if (activeRun) return activeRun;
  activeRun = (async () => {
    try {
      lastResult = await sweep();
      lastRunAt = new Date();
      return lastResult;
    } catch (error) {
      console.error("Booking expiry sweep failed; retrying next sweep");
      throw error;
    } finally {
      activeRun = null;
    }
  })();
  return activeRun;
}
export function startExpiryWorker() {
  if (timer) return;
  const interval = Number(process.env.EXPIRY_SWEEP_MS ?? 30_000);
  if (!Number.isInteger(interval) || interval < 1000) throw new Error("Invalid EXPIRY_SWEEP_MS");
  stopping = false;
  timer = setInterval(() => { runExpirySweep().catch(() => {}); }, interval);
  timer.unref();
}
export async function stopExpiryWorker() {
  stopping = true;
  if (timer) clearInterval(timer);
  timer = null;
  const pending = activeRun;
  if (pending) {
    try { await pending; } catch { /* failure was already logged and shutdown may continue */ }
  }
}
