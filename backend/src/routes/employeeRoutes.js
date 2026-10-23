import { Router } from "express";
import {
  createEmployee,
  getEmployees,
  updateEmployeeStatus,
  updateEmployeeRole,
} from "../controllers/employeeController.js";
import {
  protect,
  allowRoles,
} from "../middleware/authMiddleware.js";
import { authenticatedUserLimiter } from "../middleware/rateLimits.js";

const router = Router();
// Only authenticated Admin/HR can view employees
router.get(
  "/",
  protect,
  authenticatedUserLimiter,
  allowRoles("admin", "hr"),
  getEmployees
);
// Only authenticated Admin/HR can create employees
router.post(
  "/",
  protect,
  authenticatedUserLimiter,
  allowRoles("admin"),
  createEmployee
);

router.post('/company-user', protect, authenticatedUserLimiter, allowRoles('admin'), (req, res, next) => {
  if (!req.user.isCompanyOwner || !req.user.companyId) return res.status(403).json({ success: false, message: 'Company owner access required.' });
  return createEmployee(req, res, next);
});


router.patch(
  "/:id/status",
  protect,
  authenticatedUserLimiter,
  allowRoles("admin", "hr"),
  updateEmployeeStatus
);

router.patch('/:id/role', protect, authenticatedUserLimiter, allowRoles('admin'), updateEmployeeRole);

export default router;
