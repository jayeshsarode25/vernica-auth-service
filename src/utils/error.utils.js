// ─────────────────────────────────────────────────────────────────
// error.utils.js
// Copy this file into every service: src/utils/error.utils.js
// ─────────────────────────────────────────────────────────────────

// ── Custom error class ─────────────────────────────────────────────
// Use this anywhere in your controllers to throw structured errors
//
// Usage:
//   throw new AppError("Product not found", 404);
//   throw new AppError("Invalid category ID", 400);
//   throw new AppError("Unauthorized", 401);

export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // marks it as a known, expected error
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── Global error handler middleware ───────────────────────────────
// Add this as the LAST app.use() in every service's app.js
//
// Usage:
//   import { globalErrorHandler } from "./utils/error.utils.js"
//   app.use(globalErrorHandler)

export const globalErrorHandler = (err, req, res, next) => {
  // default to 500 if no status set
  const statusCode = err.statusCode || 500;
  const isDev      = process.env.NODE_ENV === "development";

  // ── Log the error ──────────────────────────────────────────────
  if (statusCode >= 500) {
    // only log stack trace for server errors — not for 400/401/404
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.error(err.stack);
  } else {
    console.warn(`[${new Date().toISOString()}] ${statusCode} ${req.method} ${req.originalUrl} — ${err.message}`);
  }

  // ── Handle specific MongoDB/Mongoose errors ────────────────────

  // CastError — invalid ObjectId e.g. /api/products/not-an-id
  if (err.name === "CastError") {
    return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` });
  }

  // ValidationError — mongoose schema validation failed
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(", ") });
  }

  // Duplicate key error — e.g. email already exists
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({ message: `${field} already exists` });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ message: "Invalid token" });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Token expired, please login again" });
  }

  // Multer file size error
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "File too large" });
  }

  // ── Operational errors (thrown with AppError) ──────────────────
  // These are expected errors like "not found", "unauthorized"
  if (err.isOperational) {
    return res.status(statusCode).json({ message: err.message });
  }

  // ── Unknown/unexpected errors ──────────────────────────────────
  // In production: hide details, just send generic message
  // In development: send full error for debugging
  return res.status(500).json({
    message: isDev ? err.message : "Something went wrong, please try again later.",
    ...(isDev && { stack: err.stack }), // only show stack in development
  });
};

// ── Async wrapper ──────────────────────────────────────────────────
// Wraps async controller functions so you don't need try/catch in every one
//
// Usage — instead of:
//   export const getProduct = async (req, res) => {
//     try { ... } catch(err) { next(err) }
//   }
//
// Use:
//   export const getProduct = catchAsync(async (req, res) => {
//     ... no try/catch needed
//   });

export const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};