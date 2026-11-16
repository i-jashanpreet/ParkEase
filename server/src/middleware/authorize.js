import ROLES from "../constants/roles.js";
import { USER_STATUS } from "../constants/statuses.js";
import AppError from "../utils/AppError.js";

export function requireActiveAccount(req, res, next) {
  if (req.user?.status !== USER_STATUS.ACTIVE) {
    return next(new AppError(403, "An active account is required", "ACCOUNT_NOT_ACTIVE"));
  }
  next();
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new AppError(403, "Insufficient permissions", "FORBIDDEN"));
    }
    next();
  };
}

const requireOwnerRole = authorize(ROLES.MALL_OWNER);

export function requireApprovedOwner(req, res, next) {
  requireOwnerRole(req, res, (err) => {
    if (err) return next(err);
    requireActiveAccount(req, res, next);
  });
}
