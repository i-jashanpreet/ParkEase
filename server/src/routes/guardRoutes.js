import { Router } from "express";
import mongoose from "mongoose";
import ROLES from "../constants/roles.js";
import authenticate from "../middleware/authenticate.js";
import { requireActiveAccount } from "../middleware/authorize.js";
import GuardAssignment from "../models/GuardAssignment.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { managedMall } from "../services/guardAccess.js";
import { hashPassword } from "../utils/password.js";
import { requireFields, validateEmail, validateObjectId, validatePassword } from "../utils/validators.js";

const router = Router();
router.use(authenticate, requireActiveAccount, (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
const allowed = (body, names) => {
  if (!body || Array.isArray(body) || typeof body !== "object" || Object.keys(body).some((key) => !names.includes(key)))
    throw new AppError(400, "Unexpected fields", "INVALID_BODY");
};
const assignmentDTO = (a) => ({ id: a._id, guardId: a.guardId, mallId: a.mallId, assignedBy: a.assignedBy,
  gateLabel: a.gateLabel, isActive: a.isActive, createdAt: a.createdAt, updatedAt: a.updatedAt });

router.get("/my-assignments", async (req, res) => {
  if (req.user.role !== ROLES.GUARD) throw new AppError(403, "Guard required", "FORBIDDEN");
  const assignments = await GuardAssignment.find({ guardId: req.user._id, isActive: true }).populate("mallId", "name");
  res.json({ success: true, data: { assignments: assignments.map((a) => ({ id: a._id, mallId: a.mallId?._id,
    mallName: a.mallId?.name, gateLabel: a.gateLabel, isActive: a.isActive })) } });
});

router.patch("/assignments/:id", async (req, res) => {
  allowed(req.body, ["isActive", "gateLabel"]);
  if (typeof req.body.isActive !== "boolean") throw new AppError(400, "isActive is required", "INVALID_BODY");
  const id = validateObjectId(req.params.id, "assignmentId");
  const existing = await GuardAssignment.findById(id);
  if (!existing) throw new AppError(404, "Assignment not found", "ASSIGNMENT_NOT_FOUND");
  await managedMall(req.user, existing.mallId);
  const changes = { isActive: req.body.isActive };
  if (req.body.gateLabel !== undefined) {
    if (typeof req.body.gateLabel !== "string" || req.body.gateLabel.length > 80) throw new AppError(400, "Invalid gate label", "INVALID_BODY");
    changes.gateLabel = req.body.gateLabel.trim();
  }
  const assignment = await mongoose.connection.transaction(async (session) => {
    await User.findOneAndUpdate({ _id: existing.guardId, role: ROLES.GUARD }, { $inc: { gateRevision: 1 } }, { session, timestamps: false });
    return GuardAssignment.findOneAndUpdate({ _id: id }, { $set: changes, $inc: { revision: 1 } }, { new: true, session });
  });
  res.json({ success: true, data: { assignment: assignmentDTO(assignment) } });
});

export const mallGuards = Router();
const mallGuardAuth = [authenticate, requireActiveAccount, (_req, res, next) => {
  res.set("Cache-Control", "no-store"); next();
}];
mallGuards.post("/:mallId/guards", ...mallGuardAuth, async (req, res) => {
  allowed(req.body, ["name", "email", "phone", "initialPassword", "gateLabel"]);
  requireFields(req.body, ["name", "email", "initialPassword"]);
  await managedMall(req.user, req.params.mallId);
  const { name, phone, gateLabel } = req.body;
  if (typeof name !== "string" || name.trim().length < 2 || name.length > 100 ||
      phone != null && (typeof phone !== "string" || phone.length > 20) ||
      gateLabel != null && (typeof gateLabel !== "string" || gateLabel.length > 80))
    throw new AppError(400, "Invalid guard fields", "INVALID_BODY");
  const email = validateEmail(req.body.email);
  const passwordHash = await hashPassword(validatePassword(req.body.initialPassword));
  try {
    const result = await mongoose.connection.transaction(async (session) => {
      const mall = await managedMall(req.user, req.params.mallId, session);
      const [guard] = await User.create([{ name: name.trim(), email, phone, passwordHash,
        role: ROLES.GUARD, status: "ACTIVE", createdBy: req.user._id, mustChangePassword: true }], { session });
      const [assignment] = await GuardAssignment.create([{ guardId: guard._id, mallId: mall._id,
        assignedBy: req.user._id, gateLabel: gateLabel?.trim() ?? "" }], { session });
      return { guard, assignment };
    });
    res.status(201).json({ success: true, data: { guard: result.guard, assignment: assignmentDTO(result.assignment) } });
  } catch (error) {
    if (error.code === 11000) throw new AppError(409, "Email already belongs to an account", "EMAIL_CONFLICT");
    throw error;
  }
});

mallGuards.get("/:mallId/guards", ...mallGuardAuth, async (req, res) => {
  const mall = await managedMall(req.user, req.params.mallId);
  const assignments = await GuardAssignment.find({ mallId: mall._id }).populate("guardId", "name email phone role status mustChangePassword");
  res.json({ success: true, data: { guards: assignments.map((a) => ({ user: a.guardId, assignment: assignmentDTO(a) })) } });
});

mallGuards.post("/:mallId/guard-assignments", ...mallGuardAuth, async (req, res) => {
  allowed(req.body, ["guardId", "gateLabel"]);
  requireFields(req.body, ["guardId"]);
  const mall = await managedMall(req.user, req.params.mallId);
  const guardId = validateObjectId(req.body.guardId, "guardId");
  const guard = await User.findOne({ _id: guardId, role: ROLES.GUARD, status: "ACTIVE" });
  if (!guard) throw new AppError(404, "Guard not found", "GUARD_NOT_FOUND");
  if (req.user.role !== ROLES.ADMIN && String(guard.createdBy) !== String(req.user._id))
    throw new AppError(404, "Guard not found", "GUARD_NOT_FOUND");
  const gateLabel = req.body.gateLabel ?? "";
  if (typeof gateLabel !== "string" || gateLabel.length > 80) throw new AppError(400, "Invalid gate label", "INVALID_BODY");
  const assignment = await GuardAssignment.findOneAndUpdate({ guardId, mallId: mall._id },
    { $set: { isActive: true, gateLabel: gateLabel.trim(), assignedBy: req.user._id } }, { upsert: true, new: true });
  res.json({ success: true, data: { assignment: assignmentDTO(assignment) } });
});

export default router;
