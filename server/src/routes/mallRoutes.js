import { Router } from "express";
import authenticate from "../middleware/authenticate.js";
import { requireApprovedOwner } from "../middleware/authorize.js";
import { MALL_STATUS } from "../constants/statuses.js";
import Mall from "../models/Mall.js";
import AppError from "../utils/AppError.js";
import { requireFields, validateObjectId } from "../utils/validators.js";
import Booking from "../models/Booking.js";
import mongoose from "mongoose";
import { checkOperatingHours, liveConfirmedBookings } from "../utils/bookingWindow.js";

const router = Router();

router.get("/owner/my-malls", authenticate, requireApprovedOwner, async (req, res) => {
  const malls = await Mall.find({ ownerId: req.user._id }).sort({ createdAt: -1, _id: -1 });
  res.set("Cache-Control", "no-store");
  res.json({ success: true, message: "Your malls retrieved", data: { malls } });
});

router.post("/", authenticate, requireApprovedOwner, async (req, res) => {
  requireFields(req.body, ["name", "city", "address", "hourlyRatePaise"]);
  const { name, city, address, description, openingTime, closingTime, hourlyRatePaise } = req.body;
  const textFields = { name, city, address, description, openingTime, closingTime };
  for (const [field, value] of Object.entries(textFields)) {
    if (value !== undefined && typeof value !== "string") {
      throw new AppError(400, `${field} must be a string`, "INVALID_MALL");
    }
  }
  if (!Number.isInteger(hourlyRatePaise)) {
    throw new AppError(400, "Hourly rate must be an integer number of paise", "INVALID_MALL");
  }

  const mall = new Mall({ ...textFields, hourlyRatePaise, ownerId: req.user._id });
  try {
    await mall.save();
  } catch (err) {
    if (err.name === "ValidationError") {
      const details = Object.values(err.errors).map(({ path, message }) => ({ field: path, issue: message }));
      throw new AppError(400, "Check the mall details and try again", "INVALID_MALL", details);
    }
    if (err.code === 11000) {
      throw new AppError(409, "A mall with this name, city, and address already exists", "MALL_EXISTS");
    }
    throw err;
  }

  res.set("Cache-Control", "no-store");
  res.status(201).json({ success: true, message: "Mall submitted for approval", data: { mall } });
});

const publicMallFields = "name city address description hourlyRatePaise openingTime closingTime status";

router.patch("/:mallId", authenticate, requireApprovedOwner, async (req, res) => {
  const id = validateObjectId(req.params.mallId, "mallId");
  const allowed = ["description", "openingTime", "closingTime", "hourlyRatePaise", "name", "city", "address"];
  if (!req.body || Array.isArray(req.body) || typeof req.body !== "object" ||
      !Object.keys(req.body).length || Object.keys(req.body).some((key) => !allowed.includes(key)))
    throw new AppError(400, "Invalid mall fields", "INVALID_MALL");
  const changes = {};
  for (const field of allowed) if (req.body[field] !== undefined) changes[field] = req.body[field];
  for (const [field, value] of Object.entries(changes)) {
    if (field === "hourlyRatePaise") {
      if (!Number.isInteger(value) || value < 0 || value > 1_000_000)
        throw new AppError(400, "Hourly rate must be an integer number of paise", "INVALID_MALL");
    } else if (typeof value !== "string" || (field !== "description" && !value.trim())) {
      throw new AppError(400, `Invalid ${field}`, "INVALID_MALL");
    }
  }
  const limits = { name: 120, city: 80, address: 250, description: 500 };
  for (const [field, max] of Object.entries(limits)) if (changes[field]?.length > max)
    throw new AppError(400, `Invalid ${field}`, "INVALID_MALL");
  for (const field of ["openingTime", "closingTime"]) if (changes[field] && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(changes[field]))
    throw new AppError(400, `Invalid ${field}`, "INVALID_MALL");
  const identity = ["name", "city", "address"].some((field) => field in changes);
  const schedule = ["openingTime", "closingTime"].some((field) => field in changes);
  const mall = await mongoose.connection.transaction(async (session) => {
    const current = await Mall.findOneAndUpdate({ _id: id, ownerId: req.user._id, status: "APPROVED" },
      { $inc: { bookingSequence: 1 } }, { session, new: true, timestamps: false });
    if (!current) throw new AppError(404, "Mall not found", "MALL_NOT_FOUND");
    const outstanding = { mallId: id, $or: [{ status: "ACTIVE" }, liveConfirmedBookings()] };
    if (identity && await Booking.exists(outstanding).session(session))
      throw new AppError(409, "Resolve outstanding visits and reservations before changing mall identity", "MALL_HAS_BOOKINGS");
    if (schedule) {
      const proposed = { openingTime: changes.openingTime ?? current.openingTime,
        closingTime: changes.closingTime ?? current.closingTime };
      for await (const booking of Booking.find(outstanding).select("startTime endTime").session(session).cursor()) {
        try { checkOperatingHours(proposed, booking); }
        catch (error) {
          if (error.code !== "OUTSIDE_MALL_HOURS") throw error;
          throw new AppError(409, "New hours would invalidate an outstanding visit or reservation", "MALL_SCHEDULE_CONFLICT");
        }
      }
    }
    if (identity) changes.status = "PENDING";
    current.set(changes);
    await current.save({ session });
    return current;
  });
  res.set("Cache-Control", "no-store").json({ success: true, data: { mall } });
});

function literalFilter(value, field, exact = false) {
  if (value === undefined) return null;
  if (typeof value !== "string" || value.length > 120) {
    throw new AppError(400, `Invalid ${field} filter`, "INVALID_MALL_FILTER");
  }
  const text = value.trim();
  if (!text) return null;
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(exact ? "^" + escaped + "$" : escaped, "i");
}

router.get("/", async (req, res) => {
  const city = literalFilter(req.query.city, "city", true);
  const search = literalFilter(req.query.search, "search");
  const filter = { status: MALL_STATUS.APPROVED };
  if (city) filter.city = city;
  if (search) filter.$or = [{ name: search }, { address: search }, { city: search }];

  const malls = await Mall.find(filter).select(publicMallFields).sort({ city: 1, name: 1, _id: 1 });
  res.set("Cache-Control", "no-store");
  res.json({ success: true, message: "Approved malls retrieved", data: { malls, total: malls.length } });
});

router.get("/:mallId", async (req, res) => {
  const id = validateObjectId(req.params.mallId, "mallId");
  res.set("Cache-Control", "no-store");
  const mall = await Mall.findOne({ _id: id, status: MALL_STATUS.APPROVED }).select(publicMallFields);
  if (!mall) throw new AppError(404, "Mall not found", "MALL_NOT_FOUND");
  res.json({ success: true, message: "Mall retrieved", data: { mall } });
});

export default router;
