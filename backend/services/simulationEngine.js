const db = require('../db');

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// -------------------------------------------------------------
// Rock Paper Scissors Strategies
// -------------------------------------------------------------
const RPS_MOVES = ['rock', 'paper', 'scissors'];
const COUNTERS = { rock: 'paper', paper: 'scissors', scissors: 'rock' };

function rpsRound(playerMove) {
    const cpuMove = RPS_MOVES[randomInt(0, 2)];
    if (playerMove === cpuMove) return { cpuMove, outcome: 'tie', score: 0 };
    if (COUNTERS[cpuMove] === playerMove) return { cpuMove, outcome: 'win', score: 1 };
    return { cpuMove, outcome: 'loss', score: -1 };
}

const rpsStrategies = {
    random: (state) => rpsRound(RPS_MOVES[randomInt(0, 2)]),
    aggressive: (state) => rpsRound('rock'),
    pattern: (state) => {
        const lastTarget = state.history.length > 0 ? state.history[state.history.length - 1] : null;
        if (!lastTarget) return rpsRound(RPS_MOVES[randomInt(0, 2)]);
        if (lastTarget.outcome === 'win') return rpsRound(lastTarget.playerMove);
        return rpsRound(COUNTERS[lastTarget.cpuMove]);
    },
    counter: (state) => {
        // Find most frequent cpu move in last 3
        const cpuMoves = state.history.slice(-3).map(h => h.cpuMove);
        if (cpuMoves.length === 0) return rpsRound(RPS_MOVES[randomInt(0, 2)]);
        const counts = { rock: 0, paper: 0, scissors: 0 };
        cpuMoves.forEach(m => counts[m]++);
        const mostFreq = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        return rpsRound(COUNTERS[mostFreq]);
    }
};

// -------------------------------------------------------------
// Mine The Gold Strategies
// -------------------------------------------------------------
function mineRound(strategyMode, difficultyMode) {
    const mineCount = difficultyMode === 'hard' ? 3 : difficultyMode === 'medium' ? 2 : 1;
    const multipliers = [0, 1.2, 1.4, 1.6, 1.9, 2.3, 2.6, 2.9, 3.5]; // simplified 9 cells, easy
    const multiplierMedium = [0, 1.3, 1.7, 2.0, 2.4, 2.8, 3.0, 3.5, 4.0];
    const multiplierHard = [0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
    
    let multTable = multipliers;
    if(difficultyMode === 'medium') multTable = multiplierMedium;
    if(difficultyMode === 'hard') multTable = multiplierHard;

    let cells = [0,1,2,3,4,5,6,7,8];
    // shuffle array to place mines
    for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    const mines = cells.slice(0, mineCount);
    
    let revealed = 0;
    while(revealed < (9 - mineCount)) {
        if (strategyMode === 'greedy' && revealed === (9 - mineCount - 1)) {
           // stops 1 before limit
           break; 
        }
        if (strategyMode === 'conservative' && revealed === 1) {
            break;
        }
        if (strategyMode === 'optimal' && revealed === 3) {
            break; // arbitrary stopping point for expected value
        }
        // open cell
        let hitMine = (Math.random() < mineCount / (9 - revealed));
        if (hitMine) return { outcome: 'loss', score: 0 };
        revealed++;
    }
    return { outcome: 'win', score: multTable[revealed] };
}

const mineStrategies = {
    greedy: (state) => mineRound('greedy', state.mode),
    conservative: (state) => mineRound('conservative', state.mode),
    optimal: (state) => mineRound('optimal', state.mode)
};

// -------------------------------------------------------------
// Guess The Number Strategies
// -------------------------------------------------------------
function guessRound(strategyName) {
    const target = randomInt(0, 100);
    // simplified outcome since typical game offers choices
    let guessesTaken = 1;
    let won = false;
    if (strategyName === 'binary') won = (randomInt(0,2) === 0); // 33% win rate abstract
    if (strategyName === 'boundary') won = (randomInt(0,3) === 0);
    if (strategyName === 'random') won = (randomInt(0,5) === 0);

    return { outcome: won ? 'win' : 'loss', score: won ? 1 : 0 };
}

const guessStrategies = {
    binary: (state) => guessRound('binary'),
    random: (state) => guessRound('random'),
    boundary: (state) => guessRound('boundary')
};

// -------------------------------------------------------------
// Flip The Coin Strategies
// -------------------------------------------------------------
function coinRound(strategyName, state) {
    const isHeads = randomInt(0, 1) === 0;
    let betHeads = true;

    if (strategyName === 'always_heads') betHeads = true;
    if (strategyName === 'streak_switch') {
        const hist = state.history;
        if (hist.length >= 2 && hist[hist.length-1].outcome === 'loss' && hist[hist.length-2].outcome === 'loss') {
            betHeads = hist[hist.length-1].cpuMove === 'heads'; // switch
        }
    }
    if (strategyName === 'martingale') betHeads = randomInt(0, 1) === 0;

    let won = (betHeads === isHeads);
    // Determine score logic
    let wager = 1;
    if (strategyName === 'martingale') {
        const hist = state.history;
        let lastLosses = 0;
        for(let i=hist.length-1; i>=0; i--) {
            if (hist[i].outcome === 'loss') lastLosses++;
            else break;
        }
        wager = Math.pow(2, lastLosses);
    }

    return { outcome: won ? 'win' : 'loss', score: won ? wager : -wager, cpuMove: isHeads ? 'heads' : 'tails', playerMove: betHeads ? 'heads' : 'tails' };
}

const coinStrategies = {
    always_heads: (state) => coinRound('always_heads', state),
    streak_switch: (state) => coinRound('streak_switch', state),
    martingale: (state) => coinRound('martingale', state)
};

// -------------------------------------------------------------
// Core Engine
// -------------------------------------------------------------
const gameEngines = {
    rps: rpsStrategies,
    mine: mineStrategies,
    guess: guessStrategies,
    coin: coinStrategies
};

function runSimulation(game, strategy, mode, n) {
    if (!gameEngines[game] || !gameEngines[game][strategy]) {
        throw new Error(`Strategy ${strategy} for game ${game} not found.`);
    }

    let wins = 0, losses = 0, ties = 0, totalScore = 0;
    let state = { mode: mode || 'hard', history: [] };

    for (let i = 0; i < n; i++) {
        // Some games are stateless across runs, some require history
        const result = gameEngines[game][strategy](state);
        
        if (result.outcome === 'win') wins++;
        else if (result.outcome === 'tie') ties++;
        else losses++;

        totalScore += result.score;

        state.history.push(result);
        if (state.history.length > 20) state.history.shift(); // Keep small memory
    }

    const win_rate = wins / n;
    const avg_score = totalScore / n;

    return {
        strategy,
        win_rate,
        avg_score,
        details: { wins, losses, ties, totalScore }
    };
}

async function runAndSaveSimulation(game, strategy, mode, n) {
    const results = runSimulation(game, strategy, mode, n);
    
    // Insert into DB
    await db.query(
        `INSERT INTO simulation_results 
         (game, mode, strategy, simulations_n, win_rate, avg_score, details, ran_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [game, mode, strategy, n, results.win_rate, results.avg_score, JSON.stringify(results.details)]
    );

    return results;
}

async function simulateMultiple(game, strategies, mode, n) {
    let resultsArr = [];
    for (const strat of strategies) {
        let res = await runAndSaveSimulation(game, strat, mode, n);
        resultsArr.push(res);
    }
    // Sort by win_rate descending
    resultsArr.sort((a,b) => b.win_rate - a.win_rate);
    return resultsArr;
}

module.exports = { runSimulation, runAndSaveSimulation, simulateMultiple, gameEngines };
