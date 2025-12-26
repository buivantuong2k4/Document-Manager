const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 60000,          // Tăng từ 30000 lên 60000
  connectionTimeoutMillis: 10000,    // Tăng từ 2000 lên 10000
  ssl: { rejectUnauthorized: false } // Thêm SSL cho Supabase
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  // Không exit - cho phép reconnect tự động
});

module.exports = pool;