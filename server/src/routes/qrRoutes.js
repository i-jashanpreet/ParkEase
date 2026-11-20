import { Router } from "express";
import authenticate from "../middleware/authenticate.js";
import { requireActiveAccount } from "../middleware/authorize.js";
import { activeAssignment } from "../services/guardAccess.js";
import { inspectQR } from "../services/qrService.js";
import { serializeBooking } from "../services/bookingLifecycle.js";
import AppError from "../utils/AppError.js";
import { accountRateLimit } from "../middleware/accountRateLimit.js";

const router = Router();
router.use(authenticate, requireActiveAccount, (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.post("/verify", accountRateLimit(30), async (req, res) => {
  if (!req.body || Array.isArray(req.body) || typeof req.body !== "object" ||
      Object.keys(req.body).some((key) => !["mallId", "token", "action"].includes(key)))
    throw new AppError(400, "Unexpected verification fields", "INVALID_BODY");
  const { mallId, token, action } = req.body ?? {};
  if (!["ENTRY", "EXIT"].includes(action)) throw new AppError(400, "Invalid action", "INVALID_ACTION");
  await activeAssignment(req.user, mallId);
  const result = await inspectQR(token, action, mallId);
  res.json({ success: true, data: { booking: result.booking ? serializeBooking(result.booking) : null,
    allowed: result.allowed, reasonCode: result.reasonCode ?? null } });
});
export default router;
