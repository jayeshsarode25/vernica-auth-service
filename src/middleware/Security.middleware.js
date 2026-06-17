import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { sanitize } from "express-mongo-sanitize"; // ✅ import sanitize fn directly
import hpp from "hpp";

// ─────────────────────────────────────────────────────────────────
// RATE LIMITERS
// ─────────────────────────────────────────────────────────────────

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 50),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later." },
});

export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.OTP_RATE_LIMIT_MAX || 25),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many OTP requests, please try again later." },
});

export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many payment requests, please try again later." },
});

// ─────────────────────────────────────────────────────────────────
// HELMET
// ─────────────────────────────────────────────────────────────────

export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc:     ["'self'", "data:", "https://ik.imagekit.io", "https://i.pinimg.com"],
      mediaSrc:   ["'self'", "https://ik.imagekit.io"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// ─────────────────────────────────────────────────────────────────
// MANUAL MONGO SANITIZE MIDDLEWARE
// Fixes: "Cannot set property query which has only a getter"
// Instead of app.use(mongoSanitize()) which tries to overwrite req.query,
// we manually sanitize req.body and req.params only,
// and sanitize req.query values without reassigning the property.
// ─────────────────────────────────────────────────────────────────

const manualSanitize = (req, res, next) => {
  // sanitize body
  if (req.body) {
    req.body = sanitize(req.body, { replaceWith: "_" });
  }

  // sanitize params
  if (req.params) {
    req.params = sanitize(req.params, { replaceWith: "_" });
  }

  // ✅ sanitize query values in place — never reassign req.query itself
  if (req.query) {
    const sanitized = sanitize({ ...req.query }, { replaceWith: "_" });
    Object.keys(sanitized).forEach((key) => {
      req.query[key] = sanitized[key];
    });
  }

  next();
};

// ─────────────────────────────────────────────────────────────────
// APPLY ALL
// ─────────────────────────────────────────────────────────────────

export const applySecurityMiddleware = (app) => {
  app.use(helmetConfig);
  app.use(generalLimiter);
  app.use(manualSanitize); // ✅ replaces app.use(mongoSanitize())
  app.use(
    hpp({
      whitelist: ["sort", "skip", "limit", "minPrice", "maxPrice", "categoryId"],
    })
  );
};
