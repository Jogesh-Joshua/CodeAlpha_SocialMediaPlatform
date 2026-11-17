'use strict';
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('--- VERIFYING DATABASE OBJECTS ---');
  
  // 1. Tables
  const tables = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  console.log('TABLES:', tables.rows.map(r => r.table_name));

  // 2. Migration ledger
  const tracking = await pool.query('SELECT * FROM schema_migrations');
  console.log('MIGRATION_LEDGER:', tracking.rows);

  // 3. Constraints
  const constraints = await pool.query(`
    SELECT table_name, constraint_name, constraint_type 
    FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
    ORDER BY table_name, constraint_name
  `);
  console.log('TOTAL_CONSTRAINTS:', constraints.rows.length);
  for (const c of constraints.rows) {
    console.log(`  [${c.table_name}] ${c.constraint_name} (${c.constraint_type})`);
  }

  // 4. Triggers
  const triggers = await pool.query(`
    SELECT trigger_name, event_manipulation, event_object_table 
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name
  `);
  console.log('TRIGGERS:', triggers.rows);

  // 5. Indexes
  const indexes = await pool.query(`
    SELECT tablename, indexname, indexdef 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    ORDER BY tablename, indexname
  `);
  console.log('TOTAL_INDEXES:', indexes.rows.length);
  for (const idx of indexes.rows) {
    console.log(`  [${idx.tablename}] ${idx.indexname}`);
  }

  await pool.end();
}

main().catch(err => {
  console.error('VERIFY ERROR:', err.message);
  process.exit(1);
});
