import { Router } from "express";
import ROLES from "../constants/roles.js";
import { MALL_STATUS, USER_STATUS } from "../constants/statuses.js";
import authenticate from "../middleware/authenticate.js";
import { authorize, requireActiveAccount } from "../middleware/authorize.js";
import Mall from "../models/Mall.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { requireFields, validateObjectId } from "../utils/validators.js";

const router = Router();
const { ACTIVE, PENDING_APPROVAL, REJECTED, SUSPENDED } = USER_STATUS;
const sourceStatus = new Map([
  [ACTIVE, PENDING_APPROVAL],
  [REJECTED, PENDING_APPROVAL],
  [SUSPENDED, ACTIVE],
]);

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
}, authenticate, requireActiveAccount, authorize(ROLES.ADMIN));

router.get("/mall-owners", async (req, res) => {
  const { status } = req.query;
  if (status !== undefined && !Object.values(USER_STATUS).includes(status)) {
    throw new AppError(400, "Invalid account status filter", "INVALID_STATUS");
  }

  const filter = { role: ROLES.MALL_OWNER };
  if (status !== undefined) filter.status = status;
  const mallOwners = await User.find(filter).sort({ createdAt: -1, _id: -1 });
  res.json({ success: true, message: "Mall owners retrieved", data: { mallOwners } });
});

router.patch("/mall-owners/:userId/status", async (req, res) => {
  const id = validateObjectId(req.params.userId, "userId");
  requireFields(req.body, ["status"]);
  const { status, rejectionReason } = req.body;
  if (!sourceStatus.has(status)) {
    throw new AppError(400, "Invalid target account status", "INVALID_STATUS");
  }
  if (status === REJECTED && (
    typeof rejectionReason !== "string" || !rejectionReason.trim() || rejectionReason.trim().length > 500
  )) {
    throw new AppError(400, "Rejection reason must contain 1 to 500 characters", "INVALID_REJECTION_REASON");
  }

  const filter = { _id: id, role: ROLES.MALL_OWNER };
  const changes = { status };
  if (status === ACTIVE) {
    changes.approvedBy = req.user._id;
    changes.approvedAt = new Date();
    changes.rejectionReason = null;
  } else if (status === REJECTED) {
    changes.rejectionReason = rejectionReason.trim();
  }

  const user = await User.findOneAndUpdate(
    { ...filter, status: sourceStatus.get(status) },
    { $set: changes },
    { new: true, runValidators: true },
  );
  if (!user) {
    if (!(await User.exists(filter))) {
      throw new AppError(404, "Mall owner not found", "OWNER_NOT_FOUND");
    }
    throw new AppError(409, "Account cannot move to the requested status", "INVALID_STATUS_TRANSITION");
  }
  res.json({ success: true, message: "Mall owner status updated", data: { user } });
});

const mallSourceStatus = new Map([
  [MALL_STATUS.APPROVED, MALL_STATUS.PENDING],
  [MALL_STATUS.REJECTED, MALL_STATUS.PENDING],
  [MALL_STATUS.INACTIVE, MALL_STATUS.APPROVED],
]);

router.get("/malls", async (req, res) => {
  const { status } = req.query;
  if (status !== undefined && !Object.values(MALL_STATUS).includes(status)) {
    throw new AppError(400, "Invalid mall status filter", "INVALID_STATUS");
  }
  const filter = status === undefined ? {} : { status };
  const malls = await Mall.find(filter).sort({ createdAt: -1, _id: -1 });
  res.json({ success: true, message: "Mall submissions retrieved", data: { malls } });
});

router.patch("/malls/:mallId/status", async (req, res) => {
  const id = validateObjectId(req.params.mallId, "mallId");
  requireFields(req.body, ["status"]);
  const { status, rejectionReason } = req.body;
  if (!mallSourceStatus.has(status)) {
    throw new AppError(400, "Invalid target mall status", "INVALID_STATUS");
  }

  const changes = { status };
  if (status === MALL_STATUS.APPROVED) {
    changes.approvedBy = req.user._id;
    changes.approvedAt = new Date();
    changes.rejectionReason = null;
  } else if (status === MALL_STATUS.REJECTED) {
    if (typeof rejectionReason !== "string" || !rejectionReason.trim() || rejectionReason.trim().length > 500) {
      throw new AppError(400, "Rejection reason must contain 1 to 500 characters", "INVALID_REJECTION_REASON");
    }
    changes.rejectionReason = rejectionReason.trim();
  }

  const mall = await Mall.findOneAndUpdate(
    { _id: id, status: mallSourceStatus.get(status) },
    { $set: changes },
    { new: true, runValidators: true },
  );
  if (!mall) {
    if (!(await Mall.exists({ _id: id }))) {
      throw new AppError(404, "Mall not found", "MALL_NOT_FOUND");
    }
    throw new AppError(409, "Mall cannot move to the requested status", "INVALID_STATUS_TRANSITION");
  }
  res.json({ success: true, message: "Mall status updated", data: { mall } });
});

export default router;
