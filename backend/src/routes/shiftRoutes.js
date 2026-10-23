
import express from "express";

import {
  createShift,
  getAllShifts,
  getMyShift,
  updateShiftStatus,
} from "../controllers/shiftController.js";

import {
  protect,
  allowRoles,
} from "../middleware/authMiddleware.js";
import { authenticatedUserLimiter } from "../middleware/rateLimits.js";

const router = express.Router();



// Admin/HR: create a shift.
router.post(
  "/",
  protect,
  authenticatedUserLimiter,
  allowRoles("admin", "hr"),
  createShift
);

// Admin/HR: list all shifts.
router.get(
  "/",
  protect,
  authenticatedUserLimiter,
  allowRoles("admin", "hr"),
  getAllShifts
);

router.patch(
  "/:id/status",
  protect,
  authenticatedUserLimiter,
  allowRoles("admin", "hr"),
  updateShiftStatus
);
// Employee: fetch their own assigned shift.
router.get("/my-shift", protect, authenticatedUserLimiter, getMyShift);
export default router;
