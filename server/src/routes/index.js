import { Router } from "express";
import healthRoutes from "./healthRoutes.js";
import authRoutes from "./authRoutes.js";
import adminRoutes from "./adminRoutes.js";
import mallRoutes from "./mallRoutes.js";
import inventoryRoutes from "./inventoryRoutes.js";

const router = Router();
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/malls", inventoryRoutes, mallRoutes);

export default router;
