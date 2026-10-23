
import express from "express";

import {
  getAdminAttendanceRecords,
  getAttendanceHistory,
  getAttendanceSummary
} from "../controllers/attendanceController.js";

import {
  getMyDailyLateStatus,
  getMyMonthlyLateSummary,
  getDailyLateArrivalReport,
  getLateArrivalReportRange,
  getMonthlyLateArrivalReport
} from "../controllers/lateArrivalController.js";

import { protect, allowRoles } from "../middleware/authMiddleware.js";
import { authenticatedUserLimiter } from "../middleware/rateLimits.js";
import { rlsContext } from "../middleware/rlsContext.js";

const router = express.Router();

router.use(protect, authenticatedUserLimiter, rlsContext);

// Employee self-service
router.get("/history", getAttendanceHistory);
router.get("/summary", getAttendanceSummary);
router.get("/late-arrival/me/daily", getMyDailyLateStatus);
router.get("/late-arrival/me/monthly", getMyMonthlyLateSummary);

// Admin/HR reports
router.get("/records", allowRoles("admin", "hr"), getAdminAttendanceRecords);
router.get(
  "/late-arrival/reports/range",
  allowRoles("admin", "hr"),
  getLateArrivalReportRange
);

router.get(
  "/late-arrival/reports/daily",
  allowRoles("admin", "hr"),
  getDailyLateArrivalReport
);

router.get(
  "/late-arrival/reports/monthly",
  allowRoles("admin", "hr"),
  getMonthlyLateArrivalReport
);

export default router;
