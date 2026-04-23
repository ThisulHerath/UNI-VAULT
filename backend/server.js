// ─── MUST be first: force Node.js to use Google DNS (8.8.8.8) ───────────────
// This fixes "querySrv ECONNREFUSED" on Windows where the local router's
// IPv6 DNS cannot resolve MongoDB Atlas SRV records.
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');

const connectDB      = require('./config/db');
const errorHandler   = require('./middleware/errorHandler');

// Route imports
const authRoutes        = require('./routes/authRoutes');
const noteRoutes        = require('./routes/noteRoutes');
const subjectRoutes     = require('./routes/subjectRoutes');
const reviewRoutes      = require('./routes/reviewRoutes');
const noteRequestRoutes = require('./routes/noteRequestRoutes');
const collectionRoutes  = require('./routes/collectionRoutes');
const studyGroupRoutes  = require('./routes/studyGroupRoutes');

// Connect to MongoDB
connectDB();

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet()); // Adds security headers (X-Frame-Options, CSP, etc.)
// Express 5 exposes req.query as a getter-only property, so sanitizing the
// request object directly can crash on assignment. Sanitize the mutable parts
// of the request instead.
app.use((req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  next();
});

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*', // Configure via env var
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // Limit request body size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Serve Uploaded Files (from local disk) ────────────────────────────────────
app.use('/uploads', express.static('uploads', { maxAge: '1d' })); // Cache for 1 day

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: '✅ UniVault API is running.' });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/notes',       noteRoutes);
app.use('/api/subjects',    subjectRoutes);
app.use('/api/reviews',     reviewRoutes);
app.use('/api/requests',    noteRequestRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/groups',      studyGroupRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// ─── Global Error Handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 UniVault server running on port ${PORT} [${process.env.NODE_ENV}]`);
});
