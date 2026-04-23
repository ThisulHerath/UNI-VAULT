// ─── MUST be first: force Node.js to use Google DNS (8.8.8.8) ───────────────
// This fixes "querySrv ECONNREFUSED" on Windows where the local router's
// IPv6 DNS cannot resolve MongoDB Atlas SRV records.
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();
require('./config/cloudinary'); // Initialize Cloudinary SDK


const express = require('express');
const cors    = require('cors');

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

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
