function parseOrigins(value) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateHttpsOrigin(value, name) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must contain valid HTTPS origins.`);
  }

  if (parsed.protocol !== "https:" || parsed.origin !== value) {
    throw new Error(`${name} must contain exact HTTPS origins without paths.`);
  }
}

export function validateProductionConfig() {
  if (process.env.NODE_ENV !== "production") return;

  const jwtSecret = process.env.JWT_SECRET || "";
  if (Buffer.byteLength(jwtSecret, "utf8") < 32) {
    throw new Error("Production JWT_SECRET must be at least 32 bytes.");
  }
  if (process.env.DEBUG) {
    throw new Error("DEBUG must be unset in production.");
  }

  let databaseUrl;
  try {
    databaseUrl = new URL(process.env.DATABASE_URL || "");
  } catch {
    throw new Error("Production DATABASE_URL must be valid.");
  }
  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol) ||
      !["require", "verify-ca", "verify-full"].includes(databaseUrl.searchParams.get("sslmode"))) {
    throw new Error("Production DATABASE_URL must use PostgreSQL TLS (sslmode=require or stronger).");
  }

  const origins = parseOrigins(process.env.CORS_ORIGINS);
  if (origins.length === 0 || !process.env.QR_DISPLAY_ORIGIN?.trim()) {
    throw new Error("Production CORS_ORIGINS and QR_DISPLAY_ORIGIN are required.");
  }
  origins.forEach((origin) => validateHttpsOrigin(origin, "CORS_ORIGINS"));
  validateHttpsOrigin(process.env.QR_DISPLAY_ORIGIN.trim(), "QR_DISPLAY_ORIGIN");

  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || "0");
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
    throw new Error("TRUST_PROXY_HOPS must be a non-negative integer.");
  }

  if (!process.env.TURNSTILE_SITE_KEY || !process.env.TURNSTILE_SECRET_KEY) {
    throw new Error("Production TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are required.");
  }
  const hostnames = parseOrigins(process.env.TURNSTILE_ALLOWED_HOSTNAMES);
  if (hostnames.length === 0 || hostnames.some((hostname) =>
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(hostname.toLowerCase()) ||
    hostname.toLowerCase() === "localhost" ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
  )) {
    throw new Error("Production TURNSTILE_ALLOWED_HOSTNAMES is required.");
  }

  if (Buffer.byteLength(process.env.QR_DISPLAY_SECRET || "", "utf8") < 32) {
    throw new Error("Production QR_DISPLAY_SECRET must be at least 32 bytes.");
  }
}

export function getTurnstileHostnames() {
  return (process.env.TURNSTILE_ALLOWED_HOSTNAMES || "")
    .split(",")
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);
}
