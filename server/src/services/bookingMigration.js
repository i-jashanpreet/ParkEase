import { entryDeadline } from "./bookingLifecycle.js";

export function migrationPlan(booking, now = new Date()) {
  const problems = [];
  if (booking.status === "CONFIRMED" && booking.entryTime) problems.push("CONFIRMED_HAS_ENTRY");
  if (booking.status === "ACTIVE" && (!booking.entryTime || booking.exitTime)) problems.push("ACTIVE_TIME_MISMATCH");
  if (booking.status === "COMPLETED" && (!booking.entryTime || !booking.exitTime || booking.exitTime < booking.entryTime))
    problems.push("COMPLETED_TIME_MISMATCH");
  if (booking.status === "COMPLETED" && booking.billingStatus !== "GENERATED") problems.push("COMPLETED_BILL_UNVERIFIED");
  if (["CANCELLED", "EXPIRED"].includes(booking.status) && booking.entryTime) problems.push("TERMINAL_HAS_ENTRY");
  if (booking.status === "EXPIRED" && !booking.expiredAt) problems.push("EXPIRED_MISSING_TIMESTAMP");
  if (problems.length) return { problems, changes: null };
  if (booking.status !== "CONFIRMED") return { problems, changes: null };
  const deadline = booking.entryDeadline ?? entryDeadline(booking);
  const changes = {};
  if (!booking.entryDeadline) changes.entryDeadline = deadline;
  // Logical expiry is the exclusive entry deadline, not the day migration happens.
  if (deadline <= now) Object.assign(changes, { status: "EXPIRED", expiredAt: deadline, billingStatus: "WAIVED" });
  return { problems, changes: Object.keys(changes).length ? changes : null };
}
