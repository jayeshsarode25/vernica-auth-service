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

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
applySecurityMiddleware(app);
app.use(morgan('dev'));



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


app.get("/api/auth/health", (req, res) => {
  res.json({ message: "Auth API is working" });
});

app.get('/', (req, res) => {
    res.status(200).json({
        message: "Auth service is running"
    });
})




import authRoutes from './routes/user.route.js'
import { globalErrorHandler } from './utils/error.utils.js';
app.use('/api/auth', authRoutes)

app.use(globalErrorHandler);

export default app;
