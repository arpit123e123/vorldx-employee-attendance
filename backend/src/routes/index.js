import attendanceRoutes from "./attendanceRoutes.js";
import express from "express";
import qrRoutes from "./qrRoutes.js";
import authRoutes from "./authRoutes.js";
import employeeRoutes from "./employeeRoutes.js";
import shiftRoutes from "./shiftRoutes.js";
import wfhRequestRoutes from "./wfhRequestRoutes.js";
import leaveRequestRoutes from "./leaveRequestRoutes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/employees", employeeRoutes);
router.use("/shifts", shiftRoutes);
router.use("/qr", qrRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/wfh-requests", wfhRequestRoutes);
router.use("/leave-requests", leaveRequestRoutes);
export default router;
