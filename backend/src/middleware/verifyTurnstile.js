import { getTurnstileHostnames } from "../config/security.js";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function getCaptchaConfig(_req, res) {
  const siteKey = process.env.TURNSTILE_SITE_KEY || "";
  return res.status(200).json({
    success: true,
    data: {
      enabled: Boolean(siteKey && process.env.TURNSTILE_SECRET_KEY),
      siteKey,
      hostnames: getTurnstileHostnames(),
    },
  });
}

export function requireTurnstile(action) {
  return async function verifyTurnstile(req, res, next) {
    const siteKey = process.env.TURNSTILE_SITE_KEY;
    const secret = process.env.TURNSTILE_SECRET_KEY;

    // Local development can run without external CAPTCHA credentials. Production
    // startup refuses to run unless both keys and allowed hostnames are configured.
    if (!siteKey && !secret && process.env.NODE_ENV !== "production") {
      return next();
    }

    const token = req.body?.captchaToken;
    if (typeof token !== "string" || token.length < 1 || token.length > 2048) {
      return res.status(400).json({
        success: false,
        message: "Complete the CAPTCHA challenge and try again.",
      });
    }

    try {
      const form = new URLSearchParams({ secret, response: token });
      if (req.ip) form.set("remoteip", req.ip);

      const response = await fetch(SITEVERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error("Siteverify returned a non-success response");

      const result = await response.json();
      const allowedHostnames = getTurnstileHostnames();
      if (
        result.success !== true ||
        result.action !== action ||
        !allowedHostnames.includes(String(result.hostname || "").toLowerCase())
      ) {
        return res.status(400).json({
          success: false,
          message: "CAPTCHA verification failed. Please try again.",
        });
      }

      return next();
    } catch (error) {
      console.error("Turnstile verification unavailable:", error.message);
      return res.status(503).json({
        success: false,
        message: "CAPTCHA verification is temporarily unavailable.",
      });
    }
  };
}
