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

const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  REQUIRED_VARS.push("COOKIE_DOMAIN", "FRONTEND_URL", "FRONTEND_URLS");
}

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
  COOKIE_DOMAIN:         process.env.COOKIE_DOMAIN,
  FRONTEND_URL:          process.env.FRONTEND_URL,
  FRONTEND_URLS:         (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
};

export default _config;
