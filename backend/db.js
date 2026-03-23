require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { Pool } = require('pg');

// PostgreSQL connection via Neon DATABASE_URL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
});

pool.on('connect', () => {
    console.log('[DB] Connected to PostgreSQL (Neon)');
});

pool.on('error', (err) => {
    console.error('[DB] Unexpected error on idle client', err);
});

module.exports = pool;
