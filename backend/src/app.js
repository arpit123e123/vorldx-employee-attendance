import errorHandler from "./middleware/errorHandler.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes/index.js";
import cookieParser from "cookie-parser";
import crypto from "node:crypto";

const app = express();
const isProduction = process.env.NODE_ENV === "production";

const configuredTrustProxyHops = Number(process.env.TRUST_PROXY_HOPS || "0");
app.set(
  "trust proxy",
  Number.isInteger(configuredTrustProxyHops) && configuredTrustProxyHops >= 0
    ? configuredTrustProxyHops
    : 0,
);
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
});

app.use(
  helmet({
    hsts: isProduction
      ? { maxAge: 31_536_000, includeSubDomains: true }
      : false,
    crossOriginResourcePolicy: { policy: "same-site" },
  }),
);

// Production traffic must terminate TLS at the application or a trusted proxy.
app.use((req, res, next) => {
  if (isProduction && !req.secure) {
    return res.status(426).json({
      success: false,
      message: "HTTPS is required.",
    });
  }
  return next();
});

app.use(express.json({ limit: "128kb", strict: true }));
app.use(cookieParser());

const configuredOrigins = (process.env.CORS_ORIGINS ||
  "http://localhost:5173,http://localhost:5174,http://localhost:8081,http://127.0.0.1:8081")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...configuredOrigins,
  process.env.QR_DISPLAY_ORIGIN?.trim(),
].filter(Boolean));

app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      // Native clients and command-line health checks may not send Origin.
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      const error = new Error("Origin not allowed by CORS");
      error.statusCode = 403;
      return callback(error);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
    maxAge: 600,
  }),
);

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "VorldX Attendance API is running",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", routes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found.",
  });
});

app.use(errorHandler);

export default app;
