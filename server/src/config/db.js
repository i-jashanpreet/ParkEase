import Mall from "../models/Mall.js";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import Booking from "../models/Booking.js";
import GuardAssignment from "../models/GuardAssignment.js";
import QRToken from "../models/QRToken.js";
import GateOperation from "../models/GateOperation.js";
import { assertRequiredIndexes, assertTransactionSupport } from "../services/indexReadiness.js";
import mongoose from "mongoose";

export default async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri)
    throw new Error(
      "MONGODB_URI is required. Create server/.env using .env.example.",
    );
  if (!/^mongodb(\+srv)?:\/\//.test(uri))
    throw new Error("MONGODB_URI must use mongodb:// or mongodb+srv://.");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  assertTransactionSupport(hello);
  const duplicates = await Booking.aggregate([
    { $match: { status: "ACTIVE" } },
    { $group: { _id: "$driverId", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }, { $limit: 1 },
  ]);
  const bayDuplicates = await Booking.aggregate([
    { $match: { status: "ACTIVE" } },
    { $group: { _id: { mallId: "$mallId", bayId: "$bayId" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }, { $limit: 1 },
  ]);
  if (duplicates.length || bayDuplicates.length) throw new Error("Duplicate ACTIVE bookings require migration review");
  await Promise.all([User.init(), RefreshToken.init(), Mall.init(), Booking.init(), GuardAssignment.init(), QRToken.init(), GateOperation.init()]);
  await assertRequiredIndexes();
  console.log("MongoDB connected");
}
