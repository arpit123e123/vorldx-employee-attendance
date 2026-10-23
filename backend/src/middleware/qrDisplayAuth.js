
import jwt from "jsonwebtoken";

export function qrDisplayAuth(req, res, next) {
  const token = req.cookies?.qrDisplaySession;
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(503).json({
      success: false,
      message: "Authentication is not configured.",
    });
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "QR display session required.",
    });
  }

  try {
    const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });

    if (payload.type !== "qr-display") {
      return res.status(401).json({
        success: false,
        message: "Invalid QR display session.",
      });
    }

    req.qrDisplay = true;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "QR display session expired. Authenticate again.",
    });
  }
}
