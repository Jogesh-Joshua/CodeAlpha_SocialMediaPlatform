'use strict';
/**
 * Server entry point.
 */

require('dotenv').config();
const app  = require('./app');
const PORT = parseInt(process.env.PORT || '3000', 10);

if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`\n  🚀 CodeAlpha Social Media Platform (Nexus)`);
    console.log(`  ➜  http://localhost:${PORT}`);
    console.log(`  ➜  ENV: ${process.env.NODE_ENV || 'development'}\n`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
  process.on('SIGINT',  () => { server.close(() => process.exit(0)); });
}

module.exports = app;
