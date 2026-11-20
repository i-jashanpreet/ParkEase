import { Router } from "express";
import { getHealth } from "../controllers/healthController.js";
import mongoose from "mongoose";
import { workerStatus } from "../services/expiryService.js";
import { assertRequiredIndexes, assertTransactionSupport } from "../services/indexReadiness.js";
const router = Router();
router.get("/", getHealth);
router.get("/ready", async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) throw new Error("Database unavailable");
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    assertTransactionSupport(hello);
    await assertRequiredIndexes();
    res.json({ success: true, data: { database: "ready", expiryWorker: workerStatus() } });
  } catch {
    res.status(503).json({ success: false, message: "Service is not ready", error: { code: "NOT_READY" } });
  }
});
export default router;
