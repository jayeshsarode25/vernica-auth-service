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

// Configure CORS with production domains
const corsOptions = {
  origin: config.FRONTEND_URLS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

// Apply CORS middleware BEFORE routes
app.use(cors(corsOptions));

// Apply body parsing middleware AFTER cors but BEFORE routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply cookie parser BEFORE routes
app.use(cookieParser());

// Apply security middleware
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
