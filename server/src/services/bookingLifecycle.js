export const entryGraceMinutes = () => {
  const value = Number(process.env.ENTRY_GRACE_MINUTES ?? 15);
  if (!Number.isInteger(value) || value < 1 || value > 120) throw new Error("Invalid ENTRY_GRACE_MINUTES");
  return value;
};

export function entryDeadline(booking) {
  return new Date(Math.min(new Date(booking.startTime).getTime() + entryGraceMinutes() * 60_000,
    new Date(booking.endTime).getTime()));
}

export function entryReason(booking, now = new Date()) {
  if (booking.status !== "CONFIRMED") return "WRONG_BOOKING_STATE";
  if (now < new Date(booking.startTime)) return "TOO_EARLY";
  if (now >= (booking.entryDeadline ?? entryDeadline(booking))) return "ENTRY_DEADLINE_PASSED";
  return null;
}

export function serializeBooking(booking, now = new Date()) {
  const b = typeof booking.toObject === "function" ? booking.toObject() : booking;
  const deadline = b.entryDeadline ?? entryDeadline(b);
  const live = b.status === "CONFIRMED" && now < deadline;
  return {
    _id: b._id, driverId: b.driverId, mallId: b.mallId, mallName: b.mallName,
    bayId: b.bayId, slotCode: b.slotCode, floor: b.floor,
    vehicleType: b.vehicleType, vehicleNumber: b.vehicleNumber,
    startTime: b.startTime, endTime: b.endTime, hourlyRatePaise: b.hourlyRatePaise,
    totalAmountPaise: b.totalAmountPaise, status: live || b.status !== "CONFIRMED" ? b.status : "EXPIRED",
    canCancel: live && now < new Date(b.startTime),
    entryDeadline: deadline, entryTime: b.entryTime ?? null, exitTime: b.exitTime ?? null,
    billingStatus: b.billingStatus ?? "PENDING", billAvailable: b.status === "COMPLETED" && b.billingStatus === "GENERATED",
    qrEligiblePurposes: entryReason(b, now) === null ? ["ENTRY"] : b.status === "ACTIVE" ? ["EXIT"] : [],
    cancelledAt: b.cancelledAt ?? null,
  };
}

export function calculateBill(booking, exitTime) {
  const elapsed = new Date(exitTime) - new Date(booking.entryTime);
  if (!Number.isFinite(elapsed) || elapsed < 0) throw new Error("Invalid visit duration");
  const durationMinutes = Math.max(1, Math.ceil(elapsed / 60_000));
  const billableHours = Math.max(1, Math.ceil(durationMinutes / 60));
  return { durationMinutes, billableHours,
    calculatedAmountPaise: billableHours * booking.hourlyRatePaise,
    billingPolicyVersion: "v1", billGeneratedAt: exitTime };
}

export function serializeBill(b) {
  if (b.status !== "COMPLETED" || b.billingStatus !== "GENERATED") return null;
  return { id: b._id, bookingId: b._id, mallId: b.mallId, mallName: b.mallName,
    slotCode: b.slotCode, floor: b.floor, vehicleNumber: b.vehicleNumber,
    entryTime: b.entryTime, exitTime: b.exitTime, durationMinutes: b.durationMinutes,
    billableHours: b.billableHours, hourlyRateSnapshotPaise: b.hourlyRatePaise,
    calculatedAmountPaise: b.calculatedAmountPaise, currency: "INR",
    billingStatus: "GENERATED", generatedAt: b.billGeneratedAt, policyVersion: b.billingPolicyVersion };
}
