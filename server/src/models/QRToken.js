import mongoose from "mongoose";

const schema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
  purpose: { type: String, enum: ["ENTRY", "EXIT"], required: true },
  tokenHash: { type: String, required: true, select: false },
  status: { type: String, enum: ["ACTIVE", "CONSUMED", "REVOKED", "EXPIRED"], default: "ACTIVE" },
  expiresAt: { type: Date, required: true },
  consumedAt: Date,
}, { timestamps: true });
schema.index({ tokenHash: 1 }, { unique: true });
schema.index({ bookingId: 1, purpose: 1 }, { unique: true, partialFilterExpression: { status: "ACTIVE" } });
export default mongoose.model("QRToken", schema);
