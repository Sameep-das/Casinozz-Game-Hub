const express = require('express');
const router = express.Router();
const db = require('../db');
const { simulateMultiple, gameEngines } = require('../services/simulationEngine');

// POST /api/simulate/:game
router.post('/simulate/:game', async (req, res) => {
    try {
        const game = req.params.game;
        const { n = 1000, strategy = 'all', mode = 'hard' } = req.body;
        
        if (!gameEngines[game]) {
            return res.status(400).json({ error: 'Unknown game' });
        }

        let strategiesToRun = [];
        if (strategy === 'all') {
            strategiesToRun = Object.keys(gameEngines[game]);
        } else {
            strategiesToRun = [strategy];
        }

        const results = await simulateMultiple(game, strategiesToRun, mode, parseInt(n));
        res.json({ game, mode, n, results });
    } catch (err) {
        console.error('Simulation error:', err);
        res.status(500).json({ error: 'Failed to run simulation' });
    }
});

// GET /api/simulate/results/:game
router.get('/simulate/results/:game', async (req, res) => {
    try {
        const game = req.params.game;
        const mode = req.query.mode || 'hard';

        // Get the latest run ID or grouped by strategy
        const { rows } = await db.query(
            `SELECT strategy, win_rate, avg_score, details, ran_at 
             FROM simulation_results 
             WHERE game = $1 AND mode = $2 
             ORDER BY ran_at DESC LIMIT 50`,
            [game, mode]
        );

        res.json({ game, mode, simulation_results: rows });
    } catch (err) {
        console.error('Fetch sim results error:', err);
        res.status(500).json({ error: 'Failed to fetch sim results' });
    }
});

module.exports = router;
