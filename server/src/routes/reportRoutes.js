import { Router } from "express";
import ROLES from "../constants/roles.js";
import authenticate from "../middleware/authenticate.js";
import { requireActiveAccount } from "../middleware/authorize.js";
import Booking from "../models/Booking.js";
import GateOperation from "../models/GateOperation.js";
import AppError from "../utils/AppError.js";
import { activeAssignment, managedMall } from "../services/guardAccess.js";
import { serializeBooking } from "../services/bookingLifecycle.js";
import { analyticsRange } from "../services/analyticsDateRange.js";
import { validateObjectId } from "../utils/validators.js";

const router = Router();
const protectedRead = [authenticate, requireActiveAccount, (_req, res, next) => {
  res.set("Cache-Control", "no-store"); next();
}];
function queryFields(query, names) {
  if (Object.keys(query).some((key) => !names.includes(key)) || Object.values(query).some((value) => typeof value !== "string"))
    throw new AppError(400, "Invalid or duplicate query parameters", "INVALID_FILTER");
}
function limit(query) {
  const raw = query.limit ?? "20";
  if (!/^\d{1,3}$/.test(raw) || Number(raw) < 1 || Number(raw) > 100)
    throw new AppError(400, "Limit must be 1 to 100", "INVALID_LIMIT");
  return Number(raw);
}
function cursorFilter(query) {
  return query.cursor ? { _id: { $lt: validateObjectId(query.cursor, "cursor") } } : {};
}
function dateFilter(query, field) {
  if (query.from === undefined && query.to === undefined) return {};
  const { start, end } = analyticsRange(query);
  return { [field]: { $gte: start, $lt: end } };
}
function searchFilter(query, fields) {
  if (query.search === undefined) return {};
  if (!query.search.trim() || query.search.length > 60) throw new AppError(400, "Invalid search", "INVALID_FILTER");
  const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return { $or: fields.map((field) => ({ [field]: { $regex: escaped, $options: "i" } })) };
}
function page(items, max, serialize = (item) => item) {
  const more = items.length > max;
  const shown = items.slice(0, max);
  return { items: shown.map(serialize), nextCursor: more ? String(shown.at(-1)._id) : null };
}
router.get("/operations/recent", ...protectedRead, async (req, res) => {
  queryFields(req.query, ["mallId", "limit", "cursor", "from", "to", "action", "search"]);
  const mallId = validateObjectId(req.query.mallId, "mallId");
  if (req.user.role === ROLES.GUARD) await activeAssignment(req.user, mallId);
  else await managedMall(req.user, mallId, null, false);
  if (req.query.action && !["ENTRY", "EXIT"].includes(req.query.action)) throw new AppError(400, "Invalid action", "INVALID_ACTION");
  const max = limit(req.query);
  const filter = { mallId, ...cursorFilter(req.query), ...dateFilter(req.query, "occurredAt"),
    ...searchFilter(req.query, ["bayId", "operationId"]) };
  if (req.query.action) filter.action = req.query.action;
  const items = await GateOperation.find(filter).select("operationId bookingId mallId bayId action guardId occurredAt")
    .sort({ _id: -1 }).limit(max + 1).lean();
  const { items: operations, nextCursor } = page(items, max, (op) => ({ id: op.operationId,
    bookingId: op.bookingId, mallId: op.mallId, bayId: op.bayId,
    action: op.action, guardId: op.guardId, occurredAt: op.occurredAt }));
  res.json({ success: true, data: { operations, nextCursor } });
});
router.get("/malls/:mallId/bookings", ...protectedRead, async (req, res) => {
  queryFields(req.query, ["status", "limit", "cursor", "from", "to", "search"]);
  const mall = await managedMall(req.user, req.params.mallId, null, false);
  const max = limit(req.query);
  const status = req.query.status;
  if (status && !["CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED", "EXPIRED"].includes(status))
    throw new AppError(400, "Invalid status", "INVALID_STATUS");
  const filter = { mallId: mall._id, ...cursorFilter(req.query), ...dateFilter(req.query, "startTime"),
    ...searchFilter(req.query, ["vehicleNumber", "slotCode"]) };
  if (status) filter.status = status;
  const items = await Booking.find(filter).sort({ _id: -1 }).limit(max + 1).lean();
  const { items: bookings, nextCursor } = page(items, max, serializeBooking);
  res.json({ success: true, data: { bookings, nextCursor } });
});
export default router;
