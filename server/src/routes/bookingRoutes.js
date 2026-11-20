import { Router } from "express";
import mongoose from "mongoose";
import { createHash } from "node:crypto";
import ROLES from "../constants/roles.js";
import authenticate from "../middleware/authenticate.js";
import { authorize, requireActiveAccount } from "../middleware/authorize.js";
import Booking from "../models/Booking.js";
import Mall from "../models/Mall.js";
import AppError from "../utils/AppError.js";
import { bookingWindow, checkOperatingHours, overlappingBookings } from "../utils/bookingWindow.js";
import { validateObjectId } from "../utils/validators.js";
import { issueQR } from "../services/qrService.js";
import QRToken from "../models/QRToken.js";
import { serializeBill, serializeBooking, entryDeadline } from "../services/bookingLifecycle.js";
import { requireBookingAccess } from "../services/bookingAccess.js";
import { accountRateLimit } from "../middleware/accountRateLimit.js";

const router = Router();
router.use(authenticate, requireActiveAccount, (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

const driverOnly = authorize(ROLES.USER);

router.get("/", driverOnly, async (req, res) => {
  const bookings = await Booking.find({ driverId: req.user._id }).sort({ startTime: -1, _id: -1 }).lean();
  res.json({ success: true, data: { bookings: bookings.map((b) => serializeBooking(b)) } });
});

router.get("/:id", async (req, res) => {
  const booking = await Booking.findById(validateObjectId(req.params.id, "bookingId"));
  if (!booking) throw new AppError(404, "Booking not found", "BOOKING_NOT_FOUND");
  await requireBookingAccess(req.user, booking);
  res.json({ success: true, data: { booking: serializeBooking(booking) } });
});

router.get("/:id/bill", async (req, res) => {
  const booking = await Booking.findById(validateObjectId(req.params.id, "bookingId"));
  if (!booking) throw new AppError(404, "Booking not found", "BOOKING_NOT_FOUND");
  await requireBookingAccess(req.user, booking);
  const bill = serializeBill(booking);
  if (!bill) throw new AppError(409, "Final bill is not ready", "BILL_NOT_READY");
  res.json({ success: true, data: { bill } });
});

router.post("/:id/qr", driverOnly, accountRateLimit(10), async (req, res) => {
  const bookingId = validateObjectId(req.params.id, "bookingId");
  if (!req.body || Array.isArray(req.body) || typeof req.body !== "object" ||
      Object.keys(req.body).some((key) => key !== "purpose"))
    throw new AppError(400, "Unexpected QR fields", "INVALID_BODY");
  const result = await issueQR(bookingId, req.user._id, req.body.purpose);
  res.status(201).json({ success: true, data: result });
});

router.post("/", driverOnly, async (req, res) => {
  const { mallId: rawMallId, bayId, vehicleNumber: plate, vehicleType } = req.body ?? {};
  const mallId = validateObjectId(rawMallId, "mallId");
  if (typeof bayId !== "string" || !/^[a-f0-9-]{36}$/i.test(bayId)) {
    throw new AppError(400, "Select a parking bay.", "INVALID_BAY");
  }
  if (!["CAR", "BIKE"].includes(vehicleType)) throw new AppError(400, "Choose Car or Bike.", "INVALID_VEHICLE");
  const vehicleNumber = typeof plate === "string" ? plate.trim().toUpperCase() : "";
  if (!/^[A-Z0-9][A-Z0-9 -]{2,19}$/.test(vehicleNumber)) {
    throw new AppError(400, "Enter a valid vehicle plate number.", "INVALID_VEHICLE");
  }
  const window = bookingWindow(req.body);
  const idempotencyKey = req.get("Idempotency-Key");
  if (idempotencyKey !== undefined && !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(idempotencyKey))
    throw new AppError(400, "Idempotency-Key must be a UUID", "INVALID_IDEMPOTENCY_KEY");
  const requestFingerprint = createHash("sha256").update(JSON.stringify({ mallId, bayId,
    vehicleType, vehicleNumber, startTime: window.startTime.toISOString(), endTime: window.endTime.toISOString() })).digest("hex");
  if (idempotencyKey) {
    const previous = await Booking.findOne({ driverId: req.user._id, idempotencyKey });
    if (previous) {
      if (previous.requestFingerprint !== requestFingerprint) throw new AppError(409, "Key was used for another booking", "IDEMPOTENCY_CONFLICT");
      return res.json({ success: true, data: { booking: serializeBooking(previous) } });
    }
  }

  let outcome;
  try {
    outcome = await mongoose.connection.transaction(async (session) => {
    // Take a write on the same document inventory publishes and maintenance edit.
    // Concurrent transactions retry against the latest inventory and bookings.
    const mall = await Mall.findOneAndUpdate(
      { _id: mallId, status: "APPROVED" },
      { $inc: { bookingSequence: 1 } },
      { session, new: true, timestamps: false },
    ).select("name openingTime closingTime hourlyRatePaise +parkingPublished").lean();
    if (!mall) throw new AppError(404, "Mall not found.", "MALL_NOT_FOUND");
    if (idempotencyKey) {
      const prior = await Booking.findOne({ driverId: req.user._id, idempotencyKey }).session(session);
      if (prior) {
        if (prior.requestFingerprint !== requestFingerprint) throw new AppError(409, "Key was used for another booking", "IDEMPOTENCY_CONFLICT");
        return { booking: prior, created: false };
      }
    }
    bookingWindow(req.body);
    checkOperatingHours(mall, window);
    let selectedBay;
    let floorName;
    for (const floor of mall.parkingPublished?.floors ?? []) {
      selectedBay = floor.rows.flat().find((bay) => bay?.id === bayId);
      if (selectedBay) { floorName = floor.name; break; }
    }
    if (!selectedBay || selectedBay.status !== "AVAILABLE" || selectedBay.vehicleType !== vehicleType ||
        await Booking.exists({ ...overlappingBookings(mallId, window), bayId }).session(session)) {
      throw new AppError(409, "That bay is unavailable for this window. Choose another bay.", "BAY_UNAVAILABLE");
    }
    const [created] = await Booking.create([{
      ...window,
      entryDeadline: entryDeadline(window),
      driverId: req.user._id,
      idempotencyKey,
      requestFingerprint: idempotencyKey ? requestFingerprint : undefined,
      mallId,
      mallName: mall.name,
      bayId,
      slotCode: selectedBay.code,
      floor: floorName,
      vehicleType,
      vehicleNumber,
      hourlyRatePaise: mall.hourlyRatePaise,
      totalAmountPaise: Math.round(mall.hourlyRatePaise * (window.endTime - window.startTime) / 3_600_000),
    }], { session });
    return { booking: created, created: true };
    });
  } catch (error) {
    if (idempotencyKey && error.code === 11000) {
      const previous = await Booking.findOne({ driverId: req.user._id, idempotencyKey });
      if (previous) {
        if (previous.requestFingerprint !== requestFingerprint)
          throw new AppError(409, "Key was used for another booking", "IDEMPOTENCY_CONFLICT");
        outcome = { booking: previous, created: false };
      }
    }
    if (!outcome) throw error;
  }
  res.status(outcome.created ? 201 : 200).json({ success: true, data: { booking: serializeBooking(outcome.booking) } });
});

router.patch("/:id/cancel", driverOnly, async (req, res) => {
  const filter = { _id: validateObjectId(req.params.id, "bookingId"), driverId: req.user._id };
  const cancelledAt = new Date();
  const booking = await mongoose.connection.transaction(async (session) => {
    const changed = await Booking.findOneAndUpdate(
      { ...filter, status: "CONFIRMED", startTime: { $gt: cancelledAt } },
      { $set: { status: "CANCELLED", cancelledAt, billingStatus: "WAIVED" } },
      { new: true, session },
    );
    if (changed) await QRToken.updateMany({ bookingId: changed._id, status: "ACTIVE" },
      { $set: { status: "REVOKED" } }, { session });
    return changed;
  });
  if (booking) return res.json({ success: true, data: { booking: serializeBooking(booking) } });
  const existing = await Booking.findOne(filter);
  if (!existing) throw new AppError(404, "Reservation not found.", "BOOKING_NOT_FOUND");
  if (existing.status === "CANCELLED") return res.json({ success: true, data: { booking: serializeBooking(existing) } });
  throw new AppError(409, "A reservation can only be cancelled before it starts.", "CANCELLATION_CLOSED");
});

export default router;
