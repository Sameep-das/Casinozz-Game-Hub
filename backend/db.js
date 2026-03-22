require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const mysql = require('mysql2/promise');

// Support PlanetScale/Railway DATABASE_URL or individual env vars
let poolConfig;

if (process.env.DATABASE_URL) {
    const { URL } = require('url');
    const u = new URL(process.env.DATABASE_URL);
    poolConfig = {
        host:     u.hostname,
        port:     parseInt(u.port) || 3306,
        user:     u.username,
        password: u.password,
        database: u.pathname.replace('/', ''),
        ssl:      { rejectUnauthorized: false }, // Required for PlanetScale
        waitForConnections: true,
        connectionLimit: 10,
    };
    console.log('[DB] Using DATABASE_URL →', u.hostname);
} else {
    poolConfig = {
        host:     process.env.DB_HOST     || 'localhost',
        user:     process.env.DB_USER     || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME     || 'casinozz_v2',
        waitForConnections: true,
        connectionLimit: 10,
    };
    console.log('[DB] Using local DB vars → localhost');
}

const db = mysql.createPool(poolConfig);
module.exports = db;
