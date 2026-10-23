import { Router } from "express";
import {
  createMyWfhRequest,
  getMyWfhRequests,
  getWfhRequests,
  reviewWfhRequest,
} from "../controllers/wfhRequestController.js";
import { allowRoles, protect } from "../middleware/authMiddleware.js";
import { authenticatedUserLimiter } from "../middleware/rateLimits.js";
import { rlsContext } from "../middleware/rlsContext.js";

const router = Router();

router.use(protect, authenticatedUserLimiter, rlsContext);
router.get("/me", allowRoles("employee"), getMyWfhRequests);
router.post("/", allowRoles("employee"), createMyWfhRequest);
router.get("/", allowRoles("admin", "hr"), getWfhRequests);
router.patch("/:id/status", allowRoles("admin", "hr"), reviewWfhRequest);

export default router;
