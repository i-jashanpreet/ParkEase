import { createHash } from "node:crypto";
import { Router } from "express";
import mongoose from "mongoose";
import authenticate from "../middleware/authenticate.js";
import { requireActiveAccount } from "../middleware/authorize.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Mall from "../models/Mall.js";
import GateOperation from "../models/GateOperation.js";
import QRToken from "../models/QRToken.js";
import AppError from "../utils/AppError.js";
import { activeAssignment, lockGuardAndAssignment } from "../services/guardAccess.js";
import { calculateBill, serializeBill, serializeBooking } from "../services/bookingLifecycle.js";
import { inspectQR, validateQR } from "../services/qrService.js";
import { validateObjectId } from "../utils/validators.js";
import { accountRateLimit } from "../middleware/accountRateLimit.js";

const router = Router();
router.use(authenticate, requireActiveAccount, (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

for (const action of ["ENTRY", "EXIT"]) router.post(`/${action.toLowerCase()}`, accountRateLimit(30), async (req, res) => {
  const { mallId: rawMallId, token, operationId } = req.body ?? {};
  if (!req.body || Array.isArray(req.body) || typeof req.body !== "object" ||
      Object.keys(req.body).some((key) => !["mallId", "token", "operationId"].includes(key)) ||
      typeof operationId !== "string" || !uuid.test(operationId)) throw new AppError(400, "Invalid operation request", "INVALID_OPERATION");
  const mallId = validateObjectId(rawMallId, "mallId");
  const tokenHash = validateQR(token);
  const fingerprint = createHash("sha256").update(`${tokenHash}:${mallId}:${action}`).digest("hex");
  await activeAssignment(req.user, mallId);
  const existing = await GateOperation.findOne({ guardId: req.user._id, operationId });
  if (existing) {
    if (existing.requestFingerprint !== fingerprint) throw new AppError(409, "Operation ID was used with different data", "OPERATION_CONFLICT");
    return res.json({ success: true, data: existing.result });
  }
  const result = await mongoose.connection.transaction(async (session) => {
    const previous = await GateOperation.findOne({ guardId: req.user._id, operationId }).session(session);
    if (previous) {
      if (previous.requestFingerprint !== fingerprint) throw new AppError(409, "Operation ID was used with different data", "OPERATION_CONFLICT");
      return previous.result;
    }
    const credentialForLock = await QRToken.findOne({ tokenHash }).select("bookingId +tokenHash").session(session);
    if (!credentialForLock) throw new AppError(409, "Credential cannot be used", "INVALID_TOKEN");
    const bookingForLock = await Booking.findById(credentialForLock.bookingId).session(session);
    if (!bookingForLock || String(bookingForLock.mallId) !== mallId)
      throw new AppError(409, "Credential cannot be used", "WRONG_MALL");
    await User.findOneAndUpdate({ _id: bookingForLock.driverId }, { $inc: { visitRevision: 1 } },
      { session, timestamps: false });
    const assignment = await activeAssignment(req.user, mallId, session);
    await lockGuardAndAssignment(req.user._id, assignment._id, session);
    // Serialize every gate write against reservation creation and layout publication.
    const mall = await Mall.findOneAndUpdate({ _id: mallId }, { $inc: { bookingSequence: 1 } },
      { session, new: true, timestamps: false });
    if (!mall) throw new AppError(404, "Mall not found", "MALL_NOT_FOUND");
    const inspection = await inspectQR(token, action, mallId, session);
    if (!inspection.allowed) throw new AppError(409, "Credential cannot be used", inspection.reasonCode);
    const { booking, credential } = inspection;
    const now = new Date();
    if (action === "ENTRY") {
      if (await Booking.exists({ status: "ACTIVE", $or: [
        { driverId: booking.driverId }, { mallId: booking.mallId, bayId: booking.bayId },
      ] }).session(session)) throw new AppError(409, "An active visit occupies this driver or bay", "ACTIVE_VISIT_CONFLICT");
      booking.status = "ACTIVE";
      booking.entryTime = now;
      booking.enteredBy = req.user._id;
    } else {
      booking.status = "COMPLETED";
      booking.exitTime = now;
      booking.exitedBy = req.user._id;
      Object.assign(booking, calculateBill(booking, now));
      booking.billingStatus = "GENERATED";
    }
    await booking.save({ session });
    credential.status = "CONSUMED";
    credential.consumedAt = now;
    await credential.save({ session });
    const operation = { id: operationId, bookingId: booking._id, mallId: booking.mallId,
      bayId: booking.bayId, action, guardId: req.user._id, occurredAt: now };
    const response = { booking: serializeBooking(booking, now), operation };
    if (action === "EXIT") response.bill = serializeBill(booking);
    await GateOperation.create([{ operationId, guardId: req.user._id, assignmentId: assignment._id,
      mallId: booking.mallId, bookingId: booking._id, bayId: booking.bayId, action,
      occurredAt: now, requestFingerprint: fingerprint, result: response }], { session });
    return response;
  });
  res.json({ success: true, data: result });
});
export default router;
