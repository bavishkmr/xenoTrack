require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const { errorHandler, notFound } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const memberRoutes = require('./routes/members');
const programRoutes = require('./routes/programs');
const staffRoutes = require('./routes/staff');
const attendanceRoutes = require('./routes/attendance');
const feeRoutes = require('./routes/fees');
const reportRoutes = require('./routes/reports');
const settingsRoutes = require('./routes/settings');

const app = express();

// ── Security & Middleware ──
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from any origin (including custom domains like xenotrack.xenotrix.in, vercel previews, etc.)
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Static uploads ──
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Health check (public) ──
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/members', memberRoutes);
app.use('/api', programRoutes);  // /api/programs, /api/groups, /api/enrollments
app.use('/api/staff', staffRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);

// ── Error handling ──
app.use(notFound);
app.use(errorHandler);

module.exports = app;
