import mongoose from "mongoose";
import { MALL_STATUS } from "../constants/statuses.js";

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const mallSchema = new mongoose.Schema({
  parkingDraft: { type: mongoose.Schema.Types.Mixed, select: false },
  parkingPublished: { type: mongoose.Schema.Types.Mixed, select: false },
  parkingRevision: { type: Number, select: false },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  address: { type: String, required: true, trim: true, maxlength: 250 },
  city: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 500, default: "" },
  hourlyRatePaise: {
    type: Number,
    required: true,
    min: 0,
    max: 1_000_000,
    validate: { validator: Number.isInteger, message: "Rate must be an integer number of paise" },
  },
  openingTime: { type: String, match: timePattern, default: "08:00" },
  closingTime: { type: String, match: timePattern, default: "23:00" },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  approvedAt: { type: Date, default: null },
  rejectionReason: { type: String, trim: true, maxlength: 500, default: null },
  status: {
    type: String,
    enum: Object.values(MALL_STATUS),
    default: MALL_STATUS.PENDING,
    required: true,
  },
}, { timestamps: true, versionKey: false });

mallSchema.index({ status: 1, city: 1, name: 1, _id: 1 });
mallSchema.index({ ownerId: 1, createdAt: -1, _id: -1 });
mallSchema.index({ name: 1, city: 1, address: 1 }, { unique: true });

export default mongoose.model("Mall", mallSchema);
