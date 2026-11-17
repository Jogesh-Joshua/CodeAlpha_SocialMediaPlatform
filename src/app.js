'use strict';
/**
 * Express application setup.
 * Separated from server.js so it can be imported in tests.
 */

require('dotenv').config();

const express  = require('express');
const path     = require('path');
const morgan   = require('morgan');
const helmet   = require('helmet');
const cors     = require('cors');
const cookieParser = require('cookie-parser');

const { authenticate }  = require('./middleware/auth');
const { errorHandler, notFound } = require('./middleware/errors');

const healthRouter = require('./routes/health');
const authRouter   = require('./routes/auth');
const postsRouter  = require('./routes/posts');
const usersRouter  = require('./routes/users');

const app = express();

// ── Security headers ───────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc : ["'self'"],
      scriptSrc  : ["'self'", "'unsafe-inline'"],
      styleSrc   : ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc    : ["'self'", 'https://fonts.gstatic.com'],
      imgSrc     : ["'self'", 'data:'],
      connectSrc : ["'self'"],
    },
  },
}));

// ── CORS ───────────────────────────────────────────────────
app.use(cors({
  origin     : process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// ── Body / Cookie parsing ──────────────────────────────────
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ── Logging ────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Session auth (populates req.user) ─────────────────────
app.use(authenticate);

// ── Static files ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── API routes ─────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/auth',   authRouter);
app.use('/api/posts',  postsRouter);
app.use('/api/users',  usersRouter);

// ── SPA fallback — serve index.html for all non-API GETs ──
app.get(/^(?!\/api).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Error handling ─────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
