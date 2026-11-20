import { createHash, randomBytes } from "node:crypto";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import QRToken from "../models/QRToken.js";
import AppError from "../utils/AppError.js";
import { entryDeadline, entryReason } from "./bookingLifecycle.js";

export const hashQR = (token) => createHash("sha256").update(token).digest("hex");
export function validateQR(token) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
    throw new AppError(400, "Invalid QR credential", "INVALID_QR");
  return hashQR(token);
}

export function qrTTL() {
  const seconds = Number(process.env.QR_TTL_SECONDS ?? 300);
  if (!Number.isInteger(seconds) || seconds < 30 || seconds > 3600) throw new Error("Invalid QR_TTL_SECONDS");
  return seconds;
}

export async function issueQR(bookingId, driverId, purpose) {
  if (!["ENTRY", "EXIT"].includes(purpose)) throw new AppError(400, "Invalid purpose", "INVALID_PURPOSE");
  const token = randomBytes(32).toString("hex");
  const result = await mongoose.connection.transaction(async (session) => {
    const booking = await Booking.findOneAndUpdate({ _id: bookingId, driverId },
      { $inc: { credentialRevision: 1 } }, { session, new: true, timestamps: false });
    if (!booking) throw new AppError(404, "Booking not found", "BOOKING_NOT_FOUND");
    const now = new Date();
    if (purpose === "ENTRY" && entryReason(booking, now) || purpose === "EXIT" && booking.status !== "ACTIVE")
      throw new AppError(409, "QR unavailable for booking state", "QR_INELIGIBLE");
    const expiresAt = new Date(Math.min(now.getTime() + qrTTL() * 1000,
      purpose === "ENTRY" ? entryDeadline(booking).getTime() : Infinity));
    await QRToken.updateMany({ bookingId, purpose, status: "ACTIVE" }, { $set: { status: "REVOKED" } }, { session });
    await QRToken.create([{ bookingId, purpose, tokenHash: hashQR(token), expiresAt }], { session });
    return { bookingId, purpose, token, expiresAt };
  });
  return result;
}

export async function inspectQR(token, purpose, mallId, session, now = new Date()) {
  const tokenHash = validateQR(token);
  const credential = await QRToken.findOne({ tokenHash }).select("+tokenHash").session(session ?? null);
  if (!credential) return { allowed: false, reasonCode: "INVALID_TOKEN" };
  const booking = await Booking.findById(credential.bookingId).session(session ?? null);
  if (!booking) return { allowed: false, reasonCode: "INVALID_TOKEN" };
  if (String(booking.mallId) !== String(mallId)) return { allowed: false, reasonCode: "WRONG_MALL" };
  if (credential.purpose !== purpose) return { allowed: false, reasonCode: "WRONG_PURPOSE" };
  if (credential.status !== "ACTIVE") return { allowed: false, reasonCode: "TOKEN_USED" };
  if (credential.expiresAt <= now) return { allowed: false, reasonCode: "TOKEN_EXPIRED" };
  const reasonCode = purpose === "ENTRY" ? entryReason(booking, now) : booking.status === "ACTIVE" ? null : "WRONG_BOOKING_STATE";
  return { booking, credential, allowed: !reasonCode, reasonCode, tokenHash };
}
