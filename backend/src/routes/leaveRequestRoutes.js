import { Router } from "express";
import {
  createMyLeaveRequest,
  getMyLeaveRequests,
  getLeaveRequests,
  reviewLeaveRequest,
} from "../controllers/leaveRequestController.js";
import { allowRoles, protect } from "../middleware/authMiddleware.js";
import { authenticatedUserLimiter } from "../middleware/rateLimits.js";
import { rlsContext } from "../middleware/rlsContext.js";

const router = Router();

router.use(protect, authenticatedUserLimiter, rlsContext);
router.get("/me", allowRoles("employee"), getMyLeaveRequests);
router.post("/", allowRoles("employee"), createMyLeaveRequest);
router.get("/", allowRoles("admin", "hr"), getLeaveRequests);
router.patch("/:id/status", allowRoles("admin", "hr"), reviewLeaveRequest);

export default router;
