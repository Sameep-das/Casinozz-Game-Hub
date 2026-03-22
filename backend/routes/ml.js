/**
 * ml.js — ML Service Proxy
 * ═══════════════════════════════════════════════════════════════
 * Architecture: Node owns ALL data fetching from DB.
 *   1. Receive game + difficulty from frontend
 *   2. Query DB for player history + global stats
 *   3. Build enriched feature payload
 *   4. Send to Python ML (pure compute, no DB)
 *   5. Return AI decision to frontend
 * ═══════════════════════════════════════════════════════════════
 */
const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const db      = require('../db');

const ML_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5001';

// Internal API key for securing Node → ML communication
const ML_HEADERS = {};
if (process.env.INTERNAL_API_KEY) {
    ML_HEADERS['x-api-key'] = process.env.INTERNAL_API_KEY;
}

const VALID_GAMES = new Set(['rps', 'coin', 'guess', 'mine']);


// ── Helper: fetch enriched features for a player+game from DB ──────────────
async function buildFeatures(game, username, sessionLastMoves) {
    const user = username || 'anonymous';

    // 1. Player's cumulative win_rate + streak for this game
    const [statsRows] = await db.query(`
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN JSON_EXTRACT(payload,'$.outcome')='"win"' THEN 1 ELSE 0 END) as wins
        FROM events e
        JOIN sessions s ON e.session_id = s.id
        WHERE e.event_type = 'result' AND s.game = ? AND s.session_key = ?
    `, [game, user]);

    const total  = parseInt(statsRows[0].total)  || 0;
    const wins   = parseInt(statsRows[0].wins)   || 0;
    const win_rate = total > 0 ? +(wins / total).toFixed(3) : 0.5;

    // 2. Current streak (last N outcomes — +ve = win streak, -ve = loss streak)
    const [recentRows] = await db.query(`
        SELECT JSON_EXTRACT(payload,'$.outcome') as outcome
        FROM events e
        JOIN sessions s ON e.session_id = s.id
        WHERE e.event_type='result' AND s.game=? AND s.session_key=?
        ORDER BY e.id DESC LIMIT 10
    `, [game, user]);

    let streak = 0;
    for (const row of recentRows) {
        const o = (row.outcome || '').replace(/"/g,'');
        if (streak === 0) { streak = o === 'win' ? 1 : -1; continue; }
        if (streak > 0 && o === 'win')  { streak++; }
        else if (streak < 0 && o === 'loss') { streak--; }
        else break;
    }

    // 3. Global move history (ALL players, last 300 events) for Markov chain
    const [globalRows] = await db.query(`
        SELECT JSON_EXTRACT(payload,'$.playerChoice') as move
        FROM events
        WHERE event_type='result' AND session_id IN (
            SELECT id FROM sessions WHERE game = ?
        )
        ORDER BY id DESC LIMIT 300
    `, [game]);
    const global_moves = globalRows
        .map(r => (r.move || '').replace(/"/g,'').toUpperCase())
        .filter(Boolean);

    const features = {
        last_moves:   sessionLastMoves || [],
        global_moves,
        win_rate,
        streak,
        total_rounds: total,
    };

    // 4. Game-specific enrichment
    if (game === 'guess') {
        const [slotRows] = await db.query(`
            SELECT JSON_EXTRACT(payload,'$.playerGuess') as slot, COUNT(*) as cnt
            FROM events
            WHERE event_type='result' AND session_id IN (
                SELECT id FROM sessions WHERE game='guess'
            )
            GROUP BY slot
        `);
        const slot_counts = {};
        slotRows.forEach(r => {
            const k = parseInt((r.slot||'').toString().replace(/"/g,''));
            if (!isNaN(k)) slot_counts[k] = parseInt(r.cnt);
        });
        features.slot_counts = slot_counts;
        features.num_options = 4;
    }

    if (game === 'mine') {
        const [cellRows] = await db.query(`
            SELECT JSON_EXTRACT(payload,'$.selectedCell') as cell, COUNT(*) as cnt
            FROM events
            WHERE event_type='result' AND session_id IN (
                SELECT id FROM sessions WHERE game='mine'
            )
            GROUP BY cell
        `);
        const cell_freq = {};
        cellRows.forEach(r => {
            const k = parseInt((r.cell||'').toString().replace(/"/g,''));
            if (!isNaN(k)) cell_freq[k] = parseInt(r.cnt);
        });
        features.cell_freq  = cell_freq;
        features.total_cells = 9;
    }

    return features;
}

// ── POST /api/ml/ai_move ─────────────────────────────────────────────────────
router.post('/ai_move', async (req, res) => {
    const { game, last_moves, difficulty, mode, username } = req.body;

    // Input validation
    if (!game || !VALID_GAMES.has(game)) {
        return res.status(400).json({ error: `Invalid game. Must be one of: ${[...VALID_GAMES]}` });
    }
    if (last_moves && !Array.isArray(last_moves)) {
        return res.status(400).json({ error: '"last_moves" must be an array' });
    }

    const fallbacks = {
        rps:   () => ({ ai_choice: ['ROCK','PAPER','SCISSORS'][Math.floor(Math.random()*3)], strategy: 'fallback' }),
        coin:  () => ({ ai_choice: Math.random()>0.5 ? 'HEADS':'TAILS', strategy: 'fallback' }),
        guess: () => ({ ai_choice: Math.floor(Math.random()*4), strategy: 'fallback' }),
        mine:  () => ({ mine_cells: [Math.floor(Math.random()*9)], strategy: 'fallback', mine_count: 1 }),
    };

    try {
        const features = await buildFeatures(game, username, last_moves || []);
        features.difficulty = difficulty || 'hard';
        features.mode       = mode || 'easy';

        const mlRes = await axios.post(
            `${ML_URL}/ai_move`,
            { game, features },
            { timeout: 8000, headers: ML_HEADERS }
        );
        res.json(mlRes.data);

    } catch (err) {
        console.error('[ml.js] ai_move error:', err.message);
        const fb = fallbacks[game];
        res.json(fb ? fb() : { ai_choice: null, strategy: 'error_fallback' });
    }
});

// ── POST /api/ml/predict/:game (existing hint/predict flow) ──────────────────
router.post('/predict/:game', async (req, res) => {
    try {
        const { game } = req.params;
        if (!VALID_GAMES.has(game)) {
            return res.status(400).json({ error: 'Invalid game' });
        }
        const mlRes = await axios.post(
            `${ML_URL}/predict`,
            { game, features: req.body.features || [] },
            { timeout: 8000, headers: ML_HEADERS }
        );
        res.json(mlRes.data);
    } catch (err) {
        console.error('[ml.js] predict error:', err.message);
        res.status(500).json({ error: 'ML service unavailable' });
    }
});

module.exports = router;
