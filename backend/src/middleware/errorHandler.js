
export default function errorHandler(err, req, res, next) {
  if (process.env.NODE_ENV === "production") {
    console.error("API request failed", {
      requestId: req.id,
      method: req.method,
      route: req.route?.path || "unmatched",
      name: err.name,
      code: err.code,
    });
  } else {
    console.error(err);
  }

  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal server error";

  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON request body.";
  } else if (err.code === "P2002") {
    statusCode = 409;
    message = "A record with this value already exists";
  } else if (err.code === "P2003" || err.code === "P2025") {
    statusCode = 400;
    message = "Referenced record is invalid or no longer exists";
  } else if (err.code === "P2022" || err.code === "P2021") {
    statusCode = 503;
    message = "The database schema is out of date. Run the backend migrations and restart the API.";
  } else if (err.name === "ZodError") {
    statusCode = 400;
  }

  if (statusCode >= 500) {
    message = "Internal server error";
  }

  return res.status(statusCode).json({
    success: false,
    message
  });
}
