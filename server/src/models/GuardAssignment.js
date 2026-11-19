import mongoose from "mongoose";

const schema = new mongoose.Schema({
  guardId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  mallId: { type: mongoose.Schema.Types.ObjectId, ref: "Mall", required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  gateLabel: { type: String, trim: true, maxlength: 80, default: "" },
  isActive: { type: Boolean, default: true },
  revision: { type: Number, default: 0 },
}, { timestamps: true });
schema.index({ guardId: 1, mallId: 1 }, { unique: true });
schema.index({ guardId: 1, isActive: 1 });
schema.index({ mallId: 1, isActive: 1 });
export default mongoose.model("GuardAssignment", schema);
