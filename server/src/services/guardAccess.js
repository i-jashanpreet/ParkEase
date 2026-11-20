import ROLES from "../constants/roles.js";
import Mall from "../models/Mall.js";
import GuardAssignment from "../models/GuardAssignment.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { validateObjectId } from "../utils/validators.js";

export async function managedMall(user, mallId, session, approved = true) {
  const filter = { _id: validateObjectId(mallId, "mallId") };
  if (approved) filter.status = "APPROVED";
  if (user.role !== ROLES.ADMIN) filter.ownerId = user._id;
  if (user.role !== ROLES.ADMIN && (user.role !== ROLES.MALL_OWNER || user.status !== "ACTIVE")) {
    throw new AppError(403, "Owner or admin required", "FORBIDDEN");
  }
  const mall = await Mall.findOne(filter).session(session ?? null);
  if (!mall) throw new AppError(404, "Mall not found", "MALL_NOT_FOUND");
  return mall;
}

export async function activeAssignment(user, mallId, session) {
  if (user.role !== ROLES.GUARD || user.status !== "ACTIVE" || user.mustChangePassword) {
    throw new AppError(403, "Guard account must be active and password updated", "GUARD_NOT_READY");
  }
  const assignment = await GuardAssignment.findOne({ guardId: user._id,
    mallId: validateObjectId(mallId, "mallId"), isActive: true }).session(session ?? null);
  if (!assignment) throw new AppError(403, "No active assignment for this mall", "GUARD_UNASSIGNED");
  return assignment;
}

export async function lockGuardAndAssignment(guardId, assignmentId, session) {
  const guard = await User.findOneAndUpdate({ _id: guardId, role: ROLES.GUARD, status: "ACTIVE", mustChangePassword: false },
    { $inc: { gateRevision: 1 } }, { session, new: true, timestamps: false });
  if (!guard) throw new AppError(403, "Guard unavailable", "GUARD_NOT_READY");
  const assignment = await GuardAssignment.findOneAndUpdate({ _id: assignmentId, guardId, isActive: true },
    { $inc: { revision: 1 } }, { session, new: true, timestamps: false });
  if (!assignment) throw new AppError(403, "Assignment unavailable", "GUARD_UNASSIGNED");
  return assignment;
}
