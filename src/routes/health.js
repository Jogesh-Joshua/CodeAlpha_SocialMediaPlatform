'use strict';
/**
 * Health check route.
 * GET /api/health
 */

const express = require('express');
const { healthCheck } = require('../db/pool');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const dbTime = await healthCheck();
    res.json({
      status : 'ok',
      service: 'CodeAlpha Social Media Platform',
      version: '1.0.0',
      db     : { status: 'ok', time: dbTime },
      uptime : Math.floor(process.uptime()),
      env    : process.env.NODE_ENV || 'development',
    });
  } catch (err) {
    res.status(503).json({
      status : 'degraded',
      service: 'CodeAlpha Social Media Platform',
      db     : { status: 'error', message: err.message },
    });
  }
});

module.exports = router;
