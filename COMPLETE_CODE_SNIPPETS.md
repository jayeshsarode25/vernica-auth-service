# COMPLETE UPDATED CODE SNIPPETS

---

## 1. src/config/config.js

```javascript
import { config as dotenvconfig } from "dotenv";
dotenvconfig();

// ─────────────────────────────────────────────────────────────────
// ENV VALIDATOR — Auth Service
// Runs at startup — crashes immediately if any required var is missing
// Better to crash early than fail silently in production
// ─────────────────────────────────────────────────────────────────

const REQUIRED_VARS = [
  "MONGO_URI",
  "JWT_SECRET",
  "TWO_FACTOR_API_KEY",
  "TWO_FACTOR_TEMPLATE",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "REDIS_HOST",
  "REDIS_PORT",
  "REDIS_PASSWORD",
];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error("Missing required environment variables:");
  missing.forEach((key) => console.error(`   - ${key}`));
  console.error("\nAdd the missing variables to your .env file and restart.");
  process.exit(1); // crash immediately — don't start the server
}

const _config = {
  MONGO_URI:             process.env.MONGO_URI,
  JWT_SECRET:            process.env.JWT_SECRET,
  TWO_FACTOR_API_KEY:    process.env.TWO_FACTOR_API_KEY,
  TWO_FACTOR_TEMPLATE:   process.env.TWO_FACTOR_TEMPLATE,
  GOOGLE_CLIENT_ID:      process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET:  process.env.GOOGLE_CLIENT_SECRET,
  REDIS_HOST:            process.env.REDIS_HOST,
  REDIS_PORT:            process.env.REDIS_PORT,
  REDIS_USERNAME:        process.env.REDIS_USERNAME,
  REDIS_PASSWORD:        process.env.REDIS_PASSWORD,
  REDIS_DB:              process.env.REDIS_DB,
  REDIS_TLS:             process.env.REDIS_TLS,
  COOKIE_DOMAIN:         process.env.COOKIE_DOMAIN || "localhost",
  FRONTEND_URLS:         (process.env.FRONTEND_URLS || "http://localhost:5173")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
};

export default _config;
```

---

## 2. src/app.js (COMPLETE FILE)

```javascript
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import morgan from 'morgan';
import passport from 'passport';
import { Strategy as GoogleStrategy } from "passport-google-oauth20"
import config from './config/config.js';
import { applySecurityMiddleware } from './middleware/Security.middleware.js'

const app = express();
app.set("trust proxy", 1);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MIDDLEWARE ORDER IS CRITICAL FOR COOKIE/CORS TO WORK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 1. CORS MUST BE FIRST (before routes)
const corsOptions = {
  origin: config.FRONTEND_URLS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// 2. Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Cookie parser BEFORE routes
app.use(cookieParser());

// 4. Security middleware
applySecurityMiddleware(app);

// 5. Morgan logging
app.use(morgan('dev'));

// 6. Passport initialization
app.use(passport.initialize());

// Configure Passport to use Google OAuth 2.0 strategy
passport.use(new GoogleStrategy({
  clientID: config.GOOGLE_CLIENT_ID,
  clientSecret: config.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback',
}, (accessToken, refreshToken, profile, done) => {
  // Here, you would typically find or create a user in your database
  // For this example, we'll just return the profile
  return done(null, profile);
}));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HEALTH CHECK ROUTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app.get("/api/auth/health", (req, res) => {
  res.json({ message: "Auth API is working" });
});

app.get('/', (req, res) => {
  res.status(200).json({
    message: "Auth service is running"
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTH ROUTES (AFTER all middleware)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import authRoutes from './routes/user.route.js'
import { globalErrorHandler } from './utils/error.utils.js';

app.use('/api/auth', authRoutes)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ERROR HANDLER (LAST)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app.use(globalErrorHandler);

export default app;
```

---

## 3. src/controller/auth.controller.js (COOKIE-RELATED PARTS)

### Imports (at top):
```javascript
import userModel from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendOtp, verifyOtp } from "../services/otp.service.js";
import { AppError, catchAsync } from "../utils/error.utils.js";
import config from "../config/config.js";  // ← ADD THIS
```

### Cookie Options Helper (updated):
```javascript
const authCookieOptions = (options = {}) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  domain: config.COOKIE_DOMAIN,  // ← ADD THIS
  maxAge: 7 * 24 * 60 * 60 * 1000,
  ...options,
});

const issueAuthCookie = (res, token, options = {}) => {
  res.cookie("token", token, authCookieOptions(options));
};
```

### signUpVerifyOtp (relevant part):
```javascript
export const signUpVerifyOtp = catchAsync(async (req, res) => {
  const { phone, otp, password } = req.body;
  const formattedPhone = normalizeIndianPhone(phone);

  if (!otp || !password) {
    throw new AppError("Phone, OTP, and password are required", 400);
  }

  const user = await findUserByPhone(
    formattedPhone,
    "+password +twoFactorSessionId",
  );

  if (!user) {
    throw new AppError("User not found. Please request OTP again.", 404);
  }

  if (!user.twoFactorSessionId) {
    throw new AppError("OTP session expired. Please request OTP again.", 400);
  }

  await verifyOtp(user.twoFactorSessionId, otp);

  user.password = await bcrypt.hash(password, 10);
  user.isPhoneVerified = true;
  user.phone = formattedPhone;
  user.twoFactorSessionId = undefined;
  user.otpLastSentAt = undefined;
  user.lastLogin = new Date();
  await user.save();

  const token = jwt.sign(
    { userId: user._id, phone: user.phone, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  issueAuthCookie(res, token);  // ← Uses authCookieOptions with domain

  res.status(200).json({
    message: "User verified and registered successfully",
    user: {
      id: user._id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      role: user.role,
      isPhoneVerified: user.isPhoneVerified,
    },
  });
});
```

### loginVerifyOtp (FIXED):
```javascript
export const loginVerifyOtp = catchAsync(async (req, res) => {
  const { otp } = req.body;
  const formattedPhone = normalizeIndianPhone(req.body.phone);

  if (!otp) {
    throw new AppError("Phone and OTP are required", 400);
  }

  const user = await findUserByPhone(formattedPhone, "+twoFactorSessionId");

  if (!user) {
    throw new AppError("User not found. Please request OTP again.", 404);
  }

  if (!user.twoFactorSessionId) {
    throw new AppError("OTP session expired. Please request OTP again.", 400);
  }

  await verifyOtp(user.twoFactorSessionId, otp);

  user.phone = formattedPhone;
  user.twoFactorSessionId = undefined;
  user.otpLastSentAt = undefined;
  user.lastLogin = new Date();
  await user.save();

  const token = jwt.sign(
    { userId: user._id, phone: user.phone, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  issueAuthCookie(res, token);  // ← REMOVED { sameSite: "lax" } override!

  res.status(200).json({
    message: "Login successful",
    user: {
      _id: user._id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      role: user.role,
      isPhoneVerified: user.isPhoneVerified,
      lastLogin: user.lastLogin,
    },
  });
});
```

### googleOAuthCallback (uses updated authCookieOptions):
```javascript
export const googleOAuthCallback = catchAsync(async (req, res) => {
  const googleUser = req.user;

  if (!googleUser) {
    throw new AppError("Google authentication failed", 401);
  }

  const email = googleUser.emails?.[0]?.value;
  if (!email) {
    throw new AppError("Google account has no email", 400);
  }

  const name =
    googleUser.displayName ||
    `${googleUser.name?.givenName ?? ""} ${googleUser.name?.familyName ?? ""}`.trim();

  let user = await userModel.findOne({
    $or: [{ email }, { googleId: googleUser.id }],
  });

  const isNewUser = !user;

  if (!user) {
    user = await userModel.create({
      email,
      googleId: googleUser.id,
      name,
      authProvider: "google",
    });
  }

  const token = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "2d" },
  );

  res.cookie("token", token, authCookieOptions());  // ← Has domain now

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const redirectStatus = isNewUser ? "registered" : "logged-in";

  res.redirect(`${frontendUrl}/auth/google/callback?status=${redirectStatus}`);
});
```

### logout (FIXED):
```javascript
export const logout = catchAsync(async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    domain: config.COOKIE_DOMAIN,  // ← ADD THIS
  });

  res.status(200).json({ message: "Logged out successfully" });
});
```

---

## 4. .env Configuration (EXAMPLE)

```env
# ────────────────────────────────────────────────────
# SERVER SETUP
# ────────────────────────────────────────────────────
NODE_ENV=production
PORT=3000

# ────────────────────────────────────────────────────
# DATABASE
# ────────────────────────────────────────────────────
MONGO_URI=mongodb://your-mongo-connection-string

# ────────────────────────────────────────────────────
# JWT & AUTHENTICATION
# ────────────────────────────────────────────────────
JWT_SECRET=your-super-secret-jwt-key-change-this

# ────────────────────────────────────────────────────
# COOKIE CONFIGURATION (CRITICAL FOR CROSS-SUBDOMAIN)
# ────────────────────────────────────────────────────
COOKIE_DOMAIN=.varnikaorganics.com
FRONTEND_URLS=https://varnikaorganics.com,https://www.varnikaorganics.com

# ────────────────────────────────────────────────────
# OTP/2FACTOR
# ────────────────────────────────────────────────────
TWO_FACTOR_API_KEY=your-2factor-api-key
TWO_FACTOR_TEMPLATE=OTP1

# ────────────────────────────────────────────────────
# GOOGLE OAUTH
# ────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ────────────────────────────────────────────────────
# REDIS
# ────────────────────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_USERNAME=default
REDIS_DB=0
REDIS_TLS=false

# ────────────────────────────────────────────────────
# FOR LOCAL DEVELOPMENT ONLY
# ────────────────────────────────────────────────────
# NODE_ENV=development
# COOKIE_DOMAIN=localhost
# FRONTEND_URLS=http://localhost:5173
```

---

## 5. signUpWithEmail (uses updated authCookieOptions):
```javascript
export const signUpWithEmail = catchAsync(async (req, res) => {
  const { phone, email, name, password } = req.body;
  const formattedPhone = normalizeIndianPhone(phone);

  const isExist = await userModel.findOne({
    $or: [{ email }, { phone: phoneSuffixQuery(formattedPhone) }],
  });

  if (isExist) {
    throw new AppError("User with this email or phone already exists", 409);
  }

  const user = await userModel.create({
    phone: formattedPhone,
    email,
    name: name || "Guest",
    password: await bcrypt.hash(password, 10),
    isPhoneVerified: false,
  });

  const token = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  issueAuthCookie(res, token);  // ← Uses authCookieOptions with domain

  res.status(201).json({
    message: "User signed up successfully",
    user: {
      _id: user._id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      isPhoneVerified: user.isPhoneVerified,
    },
  });
});
```

---

## SUMMARY OF CHANGES

| File | Change | Reason |
|------|--------|--------|
| **config.js** | Added `COOKIE_DOMAIN` & `FRONTEND_URLS` | Configurable per environment |
| **app.js** | Moved CORS first, updated options | CORS must run before routes |
| **auth.controller.js** | Added `domain` to authCookieOptions | Enable cross-subdomain sharing |
| **auth.controller.js** | Added `domain` to logout clearCookie | Ensure cookie is cleared |
| **auth.controller.js** | Removed sameSite override in loginVerifyOtp | Use consistent production settings |

---

## KEY POINTS

✅ **domain: ".varnikaorganics.com"** — Cookie shared with all subdomains  
✅ **sameSite: "none"** — Required for cross-site cookies in production  
✅ **secure: true** — HTTPS only (production requirement)  
✅ **httpOnly: true** — JavaScript cannot access cookie  
✅ **CORS credentials: true** — Allow cookies in CORS requests  
✅ **Middleware order** — CORS before routes  

---
