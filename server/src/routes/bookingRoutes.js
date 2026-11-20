import { Router } from "express";
import mongoose from "mongoose";
import ROLES from "../constants/roles.js";
import authenticate from "../middleware/authenticate.js";
import { authorize, requireActiveAccount } from "../middleware/authorize.js";
import Booking from "../models/Booking.js";
import Mall from "../models/Mall.js";
import AppError from "../utils/AppError.js";
import { bookingWindow, checkOperatingHours, overlappingBookings } from "../utils/bookingWindow.js";
import { validateObjectId } from "../utils/validators.js";
import { issueQR } from "../services/qrService.js";

const router = Router();
router.use(authenticate, requireActiveAccount, authorize(ROLES.USER), (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

function serialize(booking) {
  const { _id, mallId, mallName, bayId, slotCode, floor, vehicleType, vehicleNumber, startTime, endTime, hourlyRatePaise, totalAmountPaise, cancelledAt } = booking;
  const now = Date.now();
  const status = booking.status === "CONFIRMED" && new Date(endTime) <= now ? "ENDED" : booking.status;
  const canCancel = status === "CONFIRMED" && new Date(startTime) > now;
  return { _id, mallId, mallName, bayId, slotCode, floor, vehicleType, vehicleNumber, startTime, endTime, hourlyRatePaise, totalAmountPaise, cancelledAt, status, canCancel };
}

router.get("/", async (req, res) => {
  const bookings = await Booking.find({ driverId: req.user._id }).sort({ startTime: -1, _id: -1 }).lean();
  res.json({ success: true, data: { bookings: bookings.map(serialize) } });
});

router.post("/:id/qr", async (req, res) => {
  const bookingId = validateObjectId(req.params.id, "bookingId");
  if (!req.body || Object.keys(req.body).some((key) => key !== "purpose"))
    throw new AppError(400, "Unexpected QR fields", "INVALID_BODY");
  const result = await issueQR(bookingId, req.user._id, req.body.purpose);
  res.status(201).json({ success: true, data: result });
});

router.post("/", async (req, res) => {
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

  const booking = await mongoose.connection.transaction(async (session) => {
    // Take a write on the same document inventory publishes and maintenance edit.
    // Concurrent transactions retry against the latest inventory and bookings.
    const mall = await Mall.findOneAndUpdate(
      { _id: mallId, status: "APPROVED" },
      { $inc: { bookingSequence: 1 } },
      { session, new: true, timestamps: false },
    ).select("name openingTime closingTime hourlyRatePaise +parkingPublished").lean();
    if (!mall) throw new AppError(404, "Mall not found.", "MALL_NOT_FOUND");
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
      driverId: req.user._id,
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
    return created;
  });
  res.status(201).json({ success: true, data: { booking: serialize(booking) } });
});

router.patch("/:id/cancel", async (req, res) => {
  const filter = { _id: validateObjectId(req.params.id, "bookingId"), driverId: req.user._id };
  const cancelledAt = new Date();
  const booking = await Booking.findOneAndUpdate(
    { ...filter, status: "CONFIRMED", startTime: { $gt: cancelledAt } },
    { $set: { status: "CANCELLED", cancelledAt } },
    { new: true },
  );
  if (booking) return res.json({ success: true, data: { booking: serialize(booking) } });
  const existing = await Booking.findOne(filter);
  if (!existing) throw new AppError(404, "Reservation not found.", "BOOKING_NOT_FOUND");
  if (existing.status === "CANCELLED") return res.json({ success: true, data: { booking: serialize(existing) } });
  throw new AppError(409, "A reservation can only be cancelled before it starts.", "CANCELLATION_CLOSED");
});

export default router;
