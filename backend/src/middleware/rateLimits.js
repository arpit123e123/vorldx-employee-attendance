import { ipKeyGenerator, rateLimit } from "express-rate-limit";

export const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Try again later." },
});

export const loginIdentityLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  keyGenerator(req) {
    const identity = typeof req.body?.employeeId === "string"
      ? req.body.employeeId.trim().toUpperCase().slice(0, 50)
      : typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase().slice(0, 254)
        : "missing-identity";
    return `${ipKeyGenerator(req.ip)}:${identity}`;
  },
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Try again later." },
});

export const authenticatedUserLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  keyGenerator(req) {
    return req.user?.id || ipKeyGenerator(req.ip);
  },
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
});

export const qrDisplaySessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many display authentication attempts. Try again later.",
  },
});
