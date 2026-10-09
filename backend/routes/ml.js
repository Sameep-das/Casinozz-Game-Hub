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
const path    = require('path');
const { Worker } = require('worker_threads');
const db      = require('../db');

const ML_URL     = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5001';
const ML_TIMEOUT = parseInt(process.env.ML_SERVICE_TIMEOUT) || 8000;

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
    const { rows: statsRows } = await db.query(`
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN payload->>'outcome' = 'win' THEN 1 ELSE 0 END) as wins
        FROM events e
        JOIN sessions s ON e.session_id = s.id
        WHERE e.event_type IN ('round_result', 'result') AND s.game = $1 AND s.session_key = $2
    `, [game, user]);

    const total  = parseInt(statsRows[0].total)  || 0;
    const wins   = parseInt(statsRows[0].wins)   || 0;
    const win_rate = total > 0 ? +(wins / total).toFixed(3) : 0.5;

    // 2. Current streak (last N outcomes — +ve = win streak, -ve = loss streak)
    const { rows: recentRows } = await db.query(`
        SELECT payload->>'outcome' as outcome
        FROM events e
        JOIN sessions s ON e.session_id = s.id
        WHERE e.event_type IN ('round_result', 'result') AND s.game=$1 AND s.session_key=$2
        ORDER BY e.id DESC LIMIT 10
    `, [game, user]);

    let streak = 0;
    for (const row of recentRows) {
        const o = (row.outcome || '');
        if (streak === 0) { streak = o === 'win' ? 1 : -1; continue; }
        if (streak > 0 && o === 'win')  { streak++; }
        else if (streak < 0 && o === 'loss') { streak--; }
        else break;
    }

    // 3. Global move history (ALL players, last 300 events) for Markov chain
    const { rows: globalRows } = await db.query(`
        SELECT COALESCE(payload->>'player_move', payload->>'playerChoice') as move
        FROM events
        WHERE event_type IN ('move', 'result') AND session_id IN (
            SELECT id FROM sessions WHERE game = $1
        )
        ORDER BY id DESC LIMIT 300
    `, [game]);
    const global_moves = globalRows
        .map(r => (r.move || '').toUpperCase())
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
        const { rows: slotRows } = await db.query(`
            SELECT COALESCE(payload->>'player_move', payload->>'playerGuess', payload->>'guess') as slot, COUNT(*) as cnt
            FROM events
            WHERE event_type IN ('move', 'result') AND session_id IN (
                SELECT id FROM sessions WHERE game='guess'
            )
            GROUP BY slot
        `);
        const slot_counts = {};
        slotRows.forEach(r => {
            const k = parseInt((r.slot||'').toString());
            if (!isNaN(k)) slot_counts[k] = parseInt(r.cnt);
        });
        features.slot_counts = slot_counts;
        features.num_options = 4;
    }

    if (game === 'mine') {
        const { rows: cellRows } = await db.query(`
            SELECT COALESCE(payload->>'player_move', payload->>'selectedCell') as cell, COUNT(*) as cnt
            FROM events
            WHERE event_type IN ('move', 'result') AND session_id IN (
                SELECT id FROM sessions WHERE game='mine'
            )
            GROUP BY cell
        `);
        const cell_freq = {};
        cellRows.forEach(r => {
            const k = parseInt((r.cell||'').toString());
            if (!isNaN(k)) cell_freq[k] = parseInt(r.cnt);
        });
        features.cell_freq  = cell_freq;
        features.total_cells = 9;
    }

    return features;
}

function fallbackBatch(game, mode, context = {}) {
    const count = Math.min(parseInt(context.queue_target, 10) || 10, 10);
    const mineCount = { easy: 1, medium: 2, hard: 3 }[(mode || 'easy').toLowerCase()] || 1;
    const uniqueCells = () => {
        const cells = new Set();
        while (cells.size < mineCount) cells.add(Math.floor(Math.random() * 9));
        return [...cells];
    };
    const fallbacks = {
        rps: () => ({ counter_moves: Array.from({ length: count }, () => ['ROCK', 'PAPER', 'SCISSOR'][Math.floor(Math.random() * 3)]), strategy: 'fallback_batch' }),
        coin: () => ({ counter_moves: Array.from({ length: count }, () => (Math.random() > 0.5 ? 'HEADS' : 'TAILS')), strategy: 'fallback_batch' }),
        guess: () => ({ counter_moves: Array.from({ length: count }, () => Math.floor(Math.random() * (context.numOptions || context.num_options || 4))), strategy: 'fallback_batch' }),
        mine: () => ({ mine_cells: uniqueCells(), strategy: 'fallback_batch', mine_count: mineCount }),
    };
    return fallbacks[game] ? fallbacks[game]() : { counter_moves: [], strategy: 'fallback_batch' };
}

function runMlBatchWorker(payload) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, '..', 'workers', 'mlBatchWorker.js'), {
            workerData: {
                mlUrl: ML_URL,
                headers: ML_HEADERS,
                timeout: ML_TIMEOUT,
                payload,
            },
        });

        const timeoutId = setTimeout(() => {
            worker.terminate();
            reject(new Error('ML batch worker timeout'));
        }, ML_TIMEOUT + 500);

        worker.once('message', (message) => {
            clearTimeout(timeoutId);
            if (message.ok) resolve(message.data);
            else reject(new Error(message.error || 'ML batch worker failed'));
        });
        worker.once('error', (err) => {
            clearTimeout(timeoutId);
            reject(err);
        });
        worker.once('exit', (code) => {
            if (code !== 0) {
                clearTimeout(timeoutId);
                reject(new Error(`ML batch worker exited with code ${code}`));
            }
        });
    });
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
        rps:   () => ({ ai_choice: ['ROCK','PAPER','SCISSOR'][Math.floor(Math.random()*3)], strategy: 'fallback' }),
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
            { timeout: ML_TIMEOUT, headers: ML_HEADERS }
        );
        res.json(mlRes.data);

    } catch (err) {
        console.error('[ml.js] ai_move error:', err.message);
        const fb = fallbacks[game];
        res.json(fb ? fb() : { ai_choice: null, strategy: 'error_fallback' });
    }
});

// ── POST /api/ml/ai_batch ────────────────────────────────────────────────────
router.post('/ai_batch', async (req, res) => {
    const {
        game,
        mode = 'medium',
        difficulty = mode,
        session_key,
        session_id,
        events = [],
        context = {},
        queue_target = 10,
        request_type = 'move_batch',
    } = req.body;

    if (!game || !VALID_GAMES.has(game)) {
        return res.status(400).json({ error: `Invalid game. Must be one of: ${[...VALID_GAMES]}` });
    }
    if (!Array.isArray(events)) {
        return res.status(400).json({ error: '"events" must be an array' });
    }

    const lastMoves = events
        .filter((event) => event && event.actor === 'player')
        .map((event) => event.move)
        .filter((move) => move !== undefined && move !== null)
        .slice(-5);

    try {
        const features = await buildFeatures(game, session_key || 'anonymous', lastMoves);
        features.difficulty = difficulty;
        features.mode = mode;
        features.events = events;
        features.context = context;
        features.request_type = request_type;
        features.queue_target = Math.min(parseInt(queue_target, 10) || 10, 10);
        if (game === 'guess' && (context.numOptions || context.num_options)) {
            features.num_options = context.numOptions || context.num_options;
        }

        const mlPayload = {
            game,
            mode,
            difficulty,
            session: { id: session_id || null, key: session_key || 'anonymous' },
            events,
            features,
            queue_target: features.queue_target,
            request_type,
        };

        const data = await runMlBatchWorker(mlPayload);
        res.json(data);
    } catch (err) {
        console.error('[ml.js] ai_batch error:', err.message);
        res.json(fallbackBatch(game, mode, { ...context, queue_target }));
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
            { timeout: ML_TIMEOUT, headers: ML_HEADERS }
        );
        res.json(mlRes.data);
    } catch (err) {
        console.error('[ml.js] predict error:', err.message);
        // Fallback for predictions (hints)
        const { game } = req.params;
        const fallbacks = {
            rps:   { recommended_move: 'PAPER', confidence: 0.33, model: 'fallback' },
            mine:  { withdraw_now: false, confidence: 0.5, model: 'fallback' },
            coin:  { recommended_move: 'HEADS', confidence: 0.5, model: 'fallback' },
            guess: { recommended_move: 0, confidence: 0.25, model: 'fallback' }
        };
        res.json(fallbacks[game] || { error: 'ML service unavailable', strategy: 'error_fallback' });
    }
});

module.exports = router;
