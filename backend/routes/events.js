const express = require('express');
const router = express.Router();
const db = require('../db');

const VALID_GAMES = ['rps', 'coin', 'guess', 'mine'];
const VALID_MODES = ['easy', 'medium', 'hard'];
const MAX_PAYLOAD_KEYS = 20;

// POST /api/session/start
router.post('/start', async (req, res) => {
    try {
        const { game, mode, session_key } = req.body;

        // Input validation
        if (!game || !mode || !session_key) {
            return res.status(400).json({ error: 'Missing game, mode, or session_key' });
        }
        if (typeof game !== 'string' || typeof mode !== 'string' || typeof session_key !== 'string') {
            return res.status(400).json({ error: 'game, mode, and session_key must be strings' });
        }
        if (!VALID_GAMES.includes(game)) {
            return res.status(400).json({ error: `Invalid game. Valid: ${VALID_GAMES}` });
        }
        if (!VALID_MODES.includes(mode.toLowerCase())) {
            return res.status(400).json({ error: `Invalid mode. Valid: ${VALID_MODES}` });
        }
        if (session_key.length > 100) {
            return res.status(400).json({ error: 'session_key too long' });
        }
        
        const [result] = await db.query(
            'INSERT INTO sessions (game, mode, session_key, started_at) VALUES (?, ?, ?, NOW())',
            [game, mode.toLowerCase(), session_key]
        );
        
        res.json({ session_id: result.insertId, session_key, game, mode });
    } catch (err) {
        console.error('Error starting session:', err);
        res.status(500).json({ error: 'Failed to start session' });
    }
});

// POST /api/event
router.post('/event', async (req, res) => {
    try {
        const { session_id, event_type, payload } = req.body;

        // Input validation
        if (!session_id || !event_type || !payload) {
            return res.status(400).json({ error: 'Missing session_id, event_type, or payload' });
        }
        if (typeof session_id !== 'number' || !Number.isInteger(session_id)) {
            return res.status(400).json({ error: 'session_id must be an integer' });
        }
        if (typeof event_type !== 'string' || event_type.length > 50) {
            return res.status(400).json({ error: 'event_type must be a string (max 50 chars)' });
        }
        if (typeof payload !== 'object' || Array.isArray(payload)) {
            return res.status(400).json({ error: 'payload must be a JSON object' });
        }
        // Prevent oversized payloads
        const payloadStr = JSON.stringify(payload);
        if (payloadStr.length > 5000) {
            return res.status(400).json({ error: 'payload too large (max 5KB)' });
        }
        
        await db.query(
            'INSERT INTO events (session_id, event_type, payload, created_at) VALUES (?, ?, ?, NOW())',
            [session_id, event_type, payloadStr]
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error logging event:', err);
        res.status(500).json({ error: 'Failed to log event' });
    }
});

module.exports = router;
