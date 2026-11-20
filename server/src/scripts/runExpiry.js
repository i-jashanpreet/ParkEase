import "../config/env.js";
import connectDB from "../config/db.js";
import mongoose from "mongoose";
import { sweepExpired } from "../services/expiryService.js";

try {
  await connectDB();
  console.log(JSON.stringify(await sweepExpired()));
} finally {
  await mongoose.disconnect();
}
