import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  mallId: { type: mongoose.Schema.Types.ObjectId, ref: "Mall", required: true },
  mallName: { type: String, required: true },
  bayId: { type: String, required: true },
  slotCode: { type: String, required: true },
  floor: { type: String, required: true },
  vehicleType: { type: String, enum: ["CAR", "BIKE"], required: true },
  vehicleNumber: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  hourlyRatePaise: { type: Number, required: true },
  totalAmountPaise: { type: Number, required: true },
  status: { type: String, enum: ["CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED", "EXPIRED"], default: "CONFIRMED" },
  entryDeadline: Date,
  entryTime: Date,
  exitTime: Date,
  enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  exitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  expiredAt: Date,
  billingStatus: { type: String, enum: ["PENDING", "GENERATED", "WAIVED"], default: "PENDING" },
  calculatedAmountPaise: { type: Number, min: 0 },
  durationMinutes: Number,
  billableHours: Number,
  billGeneratedAt: Date,
  billingPolicyVersion: String,
  idempotencyKey: String,
  requestFingerprint: String,
  credentialRevision: { type: Number, default: 0, select: false },
  cancelledAt: Date,
}, { timestamps: true });

bookingSchema.index({ mallId: 1, status: 1, endTime: 1, startTime: 1, bayId: 1 });
bookingSchema.index({ driverId: 1, startTime: -1, _id: -1 });
bookingSchema.index({ driverId: 1 }, { unique: true, partialFilterExpression: { status: "ACTIVE" } });
bookingSchema.index({ mallId: 1, bayId: 1 }, { unique: true, partialFilterExpression: { status: "ACTIVE" } });
bookingSchema.index({ driverId: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } });
bookingSchema.index({ status: 1, entryDeadline: 1 });
bookingSchema.index({ mallId: 1, status: 1, entryDeadline: 1, startTime: 1 });
bookingSchema.index({ mallId: 1, status: 1, exitTime: 1 });
bookingSchema.index({ mallId: 1, status: 1, expiredAt: 1 });
bookingSchema.index({ mallId: 1, status: 1, cancelledAt: 1 });
bookingSchema.index({ mallId: 1, status: 1, billingStatus: 1, billGeneratedAt: 1 });
bookingSchema.index({ mallId: 1, _id: -1 });

export default mongoose.model("Booking", bookingSchema);
