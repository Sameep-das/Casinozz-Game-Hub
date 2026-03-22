const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Hard-fail if JWT_SECRET is not set in production (never fall back to a weak secret)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
        console.error('[FATAL] JWT_SECRET env var is not set. Refusing to start in production.');
        process.exit(1);
    } else {
        console.warn('[WARN] JWT_SECRET not set — using insecure dev default. DO NOT use in production!');
    }
}
const SECRET = JWT_SECRET || 'casinozz_dev_only_secret_do_not_deploy';

// Note: PlanetScale blocks runtime DDL. users table must exist via schema.sql import.
// The CREATE TABLE below is kept as a local-dev safety net only.
async function ensureUsersTable() {
    if (process.env.NODE_ENV !== 'production') {
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id            INT AUTO_INCREMENT PRIMARY KEY,
                username      VARCHAR(50)  UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }
}
ensureUsersTable();


// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

        const [existing] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (existing.length > 0) return res.status(400).json({ error: 'Username already exists' });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const [result] = await db.query('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]);
        
        const token = jwt.sign({ id: result.insertId, username }, SECRET, { expiresIn: '7d' });
        res.json({ message: 'User registered successfully', token, username });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(400).json({ error: 'Invalid username or password' });

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) return res.status(400).json({ error: 'Invalid username or password' });

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '7d' });
        res.json({ message: 'Login successful', token, username: user.username });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Failed to log in' });
    }
});

// Middleware for requiring auth
const requireAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });

    jwt.verify(token, SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Forbidden: Invalid token' });
        req.user = decoded;
        next();
    });
};

module.exports = { authRouter: router, requireAuth };
