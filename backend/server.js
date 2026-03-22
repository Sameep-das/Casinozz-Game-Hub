require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── 1. HELMET — secure HTTP headers ─────────────────────────────────────────
app.use(helmet());

// ── 2. CORS — lock to frontend domain only ───────────────────────────────────
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:8080', 'http://127.0.0.1:8080'];

app.use(cors({
    origin: (origin, cb) => {
        // Allow requests with no origin (curl, server-to-server) in dev only
        if (!origin && process.env.NODE_ENV !== 'production') return cb(null, true);
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        cb(new Error('CORS: origin not allowed'));
    },
    credentials: true,
}));

// ── 3. PAYLOAD SIZE LIMIT — prevent DB bloat / DoS ──────────────────────────
app.use(express.json({ limit: '50kb' }));  // reject bodies > 50KB

// ── 4. GLOBAL RATE LIMIT — 100 requests / 15 min per IP ─────────────────────
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 200,                  // per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests — try again in 15 minutes' },
});
app.use('/api', globalLimiter);

// ── 5. STRICT RATE LIMITS for auth (prevent brute-force) ─────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,   // only 15 login/register attempts per 15 min
    message: { error: 'Too many auth attempts — slow down' },
});

// ── 6. HEALTH CHECK ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'node-backend', uptime: process.uptime() });
});

// ── 7. ROUTES ────────────────────────────────────────────────────────────────
const eventsRouter      = require('./routes/events');
const simulationRouter  = require('./routes/simulation');
const mlRouter          = require('./routes/ml');
const hintsRouter       = require('./routes/hints');
const analyticsRouter   = require('./routes/analytics');
const { authRouter }    = require('./routes/auth');

app.use('/api',           eventsRouter);
app.use('/api/session',   eventsRouter);
app.use('/api',           simulationRouter);
app.use('/api/ml',        mlRouter);
app.use('/api',           hintsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/auth',      authLimiter, authRouter);  // stricter rate limit

// ── 8. 404 CATCH-ALL ─────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// ── 9. GLOBAL ERROR HANDLER ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`[Server] Casinozz backend running on :${PORT} | env: ${process.env.NODE_ENV || 'development'}`);
});
