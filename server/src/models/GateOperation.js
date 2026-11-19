import mongoose from "mongoose";

const schema = new mongoose.Schema({
  operationId: { type: String, required: true },
  guardId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "GuardAssignment", required: true },
  mallId: { type: mongoose.Schema.Types.ObjectId, ref: "Mall", required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
  bayId: { type: String, required: true },
  action: { type: String, enum: ["ENTRY", "EXIT"], required: true },
  occurredAt: { type: Date, required: true },
  result: { type: mongoose.Schema.Types.Mixed, required: true },
  requestFingerprint: { type: String, required: true },
}, { timestamps: true });
schema.index({ guardId: 1, operationId: 1 }, { unique: true });
schema.index({ mallId: 1, occurredAt: -1, _id: -1 });
export default mongoose.model("GateOperation", schema);
