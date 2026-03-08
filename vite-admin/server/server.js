// server/server.js
import dotenv from 'dotenv';
dotenv.config();

console.log("==== GOOGLE ENV CHECK ====");
console.log("ID:", process.env.GOOGLE_CLIENT_ID);
console.log("SECRET:", process.env.GOOGLE_CLIENT_SECRET);
console.log("REDIRECT:", process.env.GOOGLE_REDIRECT_URI);
console.log("===========================");

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import applicationsRoute from './routes/applications.js';
import documentsRoute from './routes/documents.js';
import mlRoute from './routes/ml.js';
import authRoute from './routes/auth.js';
import googleRoute from './routes/google.js';
import departmentsRoute from './routes/departments.js';
import adminRoute from './routes/admin.js';

// ✅ 1. Create the app FIRST
const app = express();

// Trust Render's proxy so rate limiting can read X-Forwarded-For safely
app.set('trust proxy', 1);

// ✅ 2. Enable gzip compression for ALL responses (reduces payload by 70-90%)
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6 // Balance between speed and compression ratio
}));

// ✅ 3. Rate limiting to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs (increased for CV parsing)
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});

// Apply to all API routes
app.use('/api/', apiLimiter);

// ✅ 4. Configure CORS
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://localhost:5173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "https://hirewise-maxxf2.onrender.com",
  "https://hirewise-maxx-git-main-madhabs-projects-e78e2689.vercel.app",
  "https://hiring-portal-mocha.vercel.app"
];

const corsOptions = (process.env.NODE_ENV === 'production')
  ? {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || /\.vercel\.app$/.test(origin)) {
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
  }
  : {
    origin: true, // Reflect request origin for local/LAN dev
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
  };

app.use(cors(corsOptions));

// ✅ 5. Apply middleware
app.use(express.json({ limit: '10mb' })); // Increase limit for file uploads

// ✅ 6. Health check endpoint (for monitoring/keep-alive)
app.get("/", (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ✅ 7. Define routes
app.get("/api", (req, res) => {
  res.json({ users: ["maxx1", "maxx2", "maxx3"] });
});

app.use("/api/applications", applicationsRoute);
app.use("/api/documents", documentsRoute);
app.use("/api/ml", mlRoute);
app.use("/api/auth", authRoute);
app.use("/api/google", googleRoute);
app.use("/api/departments", departmentsRoute);
app.use("/api/admin", adminRoute);

// OAuth2 callback route (at root level for Google redirect)
app.get('/oauth2callback', (req, res) => {
  // Redirect to the google route handler
  res.redirect(`/api/google/callback?${new URLSearchParams(req.query).toString()}`);
});

// ✅ 8. Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ✅ 9. Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Compression: ENABLED`);
  console.log(`🛡️  Rate limiting: ENABLED`);
});
