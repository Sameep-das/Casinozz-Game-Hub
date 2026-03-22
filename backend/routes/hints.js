const express = require('express');
const router = express.Router();
const db = require('../db');
const axios = require('axios');
const { generateHint, narrateProbability } = require('../services/gemini');

const ML_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5001';
const ML_HEADERS = {};
if (process.env.INTERNAL_API_KEY) {
    ML_HEADERS['x-api-key'] = process.env.INTERNAL_API_KEY;
}

const VALID_GAMES = new Set(['rps', 'coin', 'guess', 'mine']);

// GET /api/hint/:game
router.get('/hint/:game', async (req, res) => {
    try {
        const game = req.params.game;
        if (!VALID_GAMES.has(game)) {
            return res.status(400).json({ error: 'Invalid game' });
        }

        const { session_id } = req.query;
        let recentEvents = [];
        if (session_id) {
            // Validate session_id is a number
            const sid = parseInt(session_id);
            if (isNaN(sid)) return res.status(400).json({ error: 'session_id must be a number' });
            const [rows] = await db.query('SELECT payload FROM events WHERE session_id = ? ORDER BY id DESC LIMIT 5', [sid]);
            recentEvents = rows.map(r => r.payload);
        }
        
        const hint = await generateHint(game, recentEvents);
        res.json({ game, hint });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate hint' });
    }
});

// GET /api/probability/:game
router.get('/probability/:game', async (req, res) => {
    const game = req.params.game;
    if (!VALID_GAMES.has(game)) {
        return res.status(400).json({ error: 'Invalid game' });
    }

    try {
        let features = game === 'mine' ? [0,3,6,1.4,1,1] : ['rock','paper'];
        
        const mlRes = await axios.post(
            `${ML_URL}/predict`,
            { game, features },
            { timeout: 8000, headers: ML_HEADERS }
        );
        const prediction = mlRes.data;
        
        const narration = await narrateProbability(game, prediction);
        res.json({ game, prediction, narration });
    } catch (err) {
        console.error("Probability endpoint error:", err.message);
        res.status(500).json({ error: 'Failed to narrate probability' });
    }
});

module.exports = router;
