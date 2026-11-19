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
  status: { type: String, enum: ["CONFIRMED", "CANCELLED"], default: "CONFIRMED" },
  cancelledAt: Date,
}, { timestamps: true });

bookingSchema.index({ mallId: 1, status: 1, endTime: 1, startTime: 1, bayId: 1 });
bookingSchema.index({ driverId: 1, startTime: -1, _id: -1 });

export default mongoose.model("Booking", bookingSchema);
