const express = require('express');
const router = express.Router();
const db = require('../db');
const axios = require('axios');
const { requireAuth } = require('./auth');

const ML_SERVICE_URL = 'http://127.0.0.1:5001';

// GET /api/analytics/user
router.get('/user', requireAuth, async (req, res) => {
    try {
        const username = req.user.username;
        
        const [overallRows] = await db.query(`
            SELECT 
                COUNT(*) as total_rounds,
                SUM(CASE WHEN JSON_EXTRACT(payload, '$.outcome') = 'win' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0) as win_rate
            FROM events e
            JOIN sessions s ON e.session_id = s.id
            WHERE e.event_type = 'result' AND s.session_key = ?
        `, [username]);

        const [gameRows] = await db.query(`
            SELECT 
                s.game,
                COUNT(*) as total_rounds,
                SUM(CASE WHEN JSON_EXTRACT(payload, '$.outcome') = 'win' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0) as win_rate
            FROM events e
            JOIN sessions s ON e.session_id = s.id
            WHERE e.event_type = 'result' AND s.session_key = ?
            GROUP BY s.game
        `, [username]);

        res.json({
            overall: {
                total_rounds: overallRows[0].total_rounds || 0,
                win_rate: parseFloat(overallRows[0].win_rate || 0)
            },
            games: gameRows
        });
    } catch (err) {
        console.error('Analytics User Error:', err);
        res.status(500).json({ error: 'Failed to retrieve user analytics' });
    }
});

// GET /api/analytics/ai_learning — rolling win rate over time (user vs AI)
router.get('/ai_learning', requireAuth, async (req, res) => {
    try {
        const username = req.user.username;
        const game = req.query.game || null;

        let query = `
            SELECT 
                JSON_EXTRACT(e.payload, '$.outcome') as outcome,
                s.game,
                e.id
            FROM events e
            JOIN sessions s ON e.session_id = s.id
            WHERE e.event_type = 'result' AND s.session_key = ?
        `;
        const params = [username];
        if (game) { query += ' AND s.game = ?'; params.push(game); }
        query += ' ORDER BY e.id ASC';

        const [rows] = await db.query(query, params);

        // Build rolling win rate: every N rounds compute cumulative win%
        const WINDOW = 5; // bucket size
        const userWinRates = [];
        const aiWinRates = [];
        const labels = [];

        let userWins = 0, aiWins = 0, total = 0;
        rows.forEach((row, idx) => {
            total++;
            const outcome = (row.outcome || '').replace(/"/g, '');
            if (outcome === 'win') userWins++;
            else if (outcome === 'loss') aiWins++;

            if (total % WINDOW === 0 || idx === rows.length - 1) {
                labels.push(`Round ${total}`);
                userWinRates.push(parseFloat(((userWins / total) * 100).toFixed(1)));
                aiWinRates.push(parseFloat(((aiWins / total) * 100).toFixed(1)));
            }
        });

        res.json({ labels, userWinRates, aiWinRates, total_rounds: total });
    } catch (err) {
        console.error('AI Learning Error:', err);
        res.status(500).json({ error: 'Failed to compute AI learning curve' });
    }
});



// GET /api/analytics/profile
router.post('/profile', async (req, res) => {
    try {
        const { session_key } = req.body;
        
        // Simplified feature vector generation (win_rate, avg_mode_risk, withdraw_ratio, streak_max, choice_diversity, session_duration)
        const features = [0.4, 0.5, 0.5, 2, 0.8, 0.3];
        
        const mlRes = await axios.post(`${ML_SERVICE_URL}/cluster`, { features });
        const { cluster_id, profile_label } = mlRes.data;
        
        await db.query(
            'INSERT INTO player_clusters (session_key, cluster_id, profile_label, feature_vec, assigned_at) VALUES (?, ?, ?, ?, NOW())',
            [session_key || 'anonymous', cluster_id, profile_label, JSON.stringify(features)]
        );
        
        res.json({ cluster_id, profile_label, features });
    } catch (err) {
        console.error('Analytics Profile Error:', err);
        res.status(500).json({ error: 'Failed to generate profile' });
    }
});

// GET /api/analytics/:game
router.get('/:game', async (req, res) => {
    try {
        const game = req.params.game;
        const [sessionRows] = await db.query('SELECT COUNT(*) as games_played FROM sessions WHERE game = ?', [game]);
        
        const [eventRows] = await db.query(`
            SELECT 
                SUM(CASE WHEN JSON_EXTRACT(payload, '$.outcome') = 'win' THEN 1 ELSE 0 END) / COUNT(*) as win_rate
            FROM events 
            WHERE event_type = 'result' AND session_id IN (
                SELECT id FROM sessions WHERE game = ?
            )
        `, [game]);

        res.json({
            game,
            games_played: sessionRows[0].games_played,
            win_rate: parseFloat(eventRows[0].win_rate || 0)
        });
    } catch (err) {
        console.error(`Analytics Game (${req.params.game}) Error:`, err);
        res.status(500).json({ error: 'Failed to retrieve game analytics' });
    }
});

module.exports = router;
