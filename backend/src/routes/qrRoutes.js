import express from "express";
import {
  generateQR,
  verifyQR,
} from "../controllers/qrController.js";
import {
  createQRDisplaySession,
} from "../controllers/qrController.js";
import {
  protect,
  allowRoles,
} from "../middleware/authMiddleware.js";
import {
  qrDisplayAuth,
} from "../middleware/qrDisplayAuth.js";
import { authenticatedUserLimiter, qrDisplaySessionLimiter } from "../middleware/rateLimits.js";
import { requireTurnstile } from "../middleware/verifyTurnstile.js";
import { rlsContext } from "../middleware/rlsContext.js";
const router = express.Router();
// Admin/HR QR generation
router.post(
  "/generate",
  protect,
  authenticatedUserLimiter,
  allowRoles("admin", "hr"),
  generateQR
);

// Dedicated QR display endpoint
router.post(
  "/display/generate",
  authenticatedUserLimiter,
  qrDisplayAuth,
  generateQR
);

// Employee QR verification
router.post(
  "/verify",
  protect,
  authenticatedUserLimiter,
  rlsContext,
  verifyQR
);
router.post(
  "/display/session",
  qrDisplaySessionLimiter,
  requireTurnstile("qr_display_session"),
  createQRDisplaySession
);
export default router;
