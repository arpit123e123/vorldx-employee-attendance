import { Router } from "express";
import {
  login,
  getMe,
  registerCompany,
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";
import { getCaptchaConfig, requireTurnstile } from "../middleware/verifyTurnstile.js";
import { authenticatedUserLimiter, loginIdentityLimiter, loginIpLimiter } from "../middleware/rateLimits.js";

const router = Router();

router.post('/company-register', loginIpLimiter, requireTurnstile('login'), registerCompany);

router.get("/captcha-config", getCaptchaConfig);
router.post(
  "/login",
  loginIpLimiter,
  loginIdentityLimiter,
  requireTurnstile("login"),
  login,
);
router.get("/me", protect, authenticatedUserLimiter, getMe);

export default router;
