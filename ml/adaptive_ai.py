"""
Adaptive AI Opponent Brain — Pure Compute Layer (NO DB ACCESS)
══════════════════════════════════════════════════════════════
Architecture: Node.js fetches all data from DB → sends enriched features here → we predict

Input contract for each game:
  features = {
    "last_moves":   [...],     # recent player choices (strings)
    "global_moves": [...],     # ALL players' history (pre-fetched by Node)
    "win_rate":     0.6,       # player's cumulative win rate
    "streak":       2,         # current win/loss streak (+ve = win, -ve = loss)
    "total_rounds": 42,        # total rounds played by this player
    "slot_counts":  {...},     # guess: {0:5, 1:2, 2:8, 3:1}
    "cell_freq":    {...},     # mine: {0:3, 1:7, ...}
    "difficulty":   "hard",
    "mode":         "easy"
  }
"""

import random

# ─────────────────────────────────────────────────────────────────────────────
def _go_random(difficulty: str) -> bool:
    """Return True if we should play randomly based on difficulty."""
    threshold = {'hard': 0.0, 'medium': 0.30, 'easy': 0.60}.get(
        (difficulty or 'hard').lower(), 0.0
    )
    return random.random() < threshold


# ═══════════════════════════════════════════════════════
# ROCK PAPER SCISSORS — Markov Chain Bigram + Win-Rate
# ═══════════════════════════════════════════════════════
COUNTERS = {'ROCK': 'PAPER', 'PAPER': 'SCISSORS', 'SCISSORS': 'ROCK'}
RPS_CHOICES = ['ROCK', 'PAPER', 'SCISSORS']

def ai_move_rps(features: dict) -> dict:
    """
    Uses bigram frequency from BOTH global history (all players, fetched by Node)
    and the current session's last_moves. If streak is >= 3, exploit it harder.
    """
    difficulty   = features.get('difficulty', 'hard')
    last_moves   = [m.upper() for m in (features.get('last_moves') or [])]
    global_moves = [m.upper() for m in (features.get('global_moves') or [])]
    streak       = features.get('streak', 0)        # +ve = player winning streak
    win_rate     = features.get('win_rate', 0.5)

    if _go_random(difficulty) or len(last_moves) < 1:
        return {'ai_choice': random.choice(RPS_CHOICES), 'confidence': 0.33, 'strategy': 'random'}

    # Combine global history with session moves (global first = prior knowledge)
    seq = global_moves + last_moves

    # Build bigram: after seeing last player move, what do they play next?
    last = last_moves[-1]
    counts = {'ROCK': 0, 'PAPER': 0, 'SCISSORS': 0}
    for i in range(len(seq) - 1):
        if seq[i] == last and seq[i + 1] in counts:
            counts[seq[i + 1]] += 1

    total = sum(counts.values())
    if total == 0:
        return {'ai_choice': random.choice(RPS_CHOICES), 'confidence': 0.33, 'strategy': 'random_fallback'}

    predicted_player = max(counts, key=counts.get)
    confidence = round(counts[predicted_player] / total, 3)

    # Streak exploitation: if player is on winning streak, they tend to stay with
    # whatever is working — double-down on the counter
    if streak >= 3:
        # Predict they'll repeat last move, counter it hard
        ai_choice = COUNTERS[last]
        return {'ai_choice': ai_choice, 'confidence': 0.85, 'strategy': 'streak_exploit'}

    return {'ai_choice': COUNTERS[predicted_player], 'confidence': confidence, 'strategy': 'markov_counter'}


# ═══════════════════════════════════════════════════════
# FLIP THE COIN — Hot-Streak + Win-Rate Aware
# ═══════════════════════════════════════════════════════
def ai_move_coin(features: dict) -> dict:
    """
    AI tracks which side the player is hot on AND their overall bias.
    If player has a high win_rate they've been lucky — AI bets against their habit.
    """
    difficulty = features.get('difficulty', 'hard')
    last_moves = [m.upper() for m in (features.get('last_moves') or [])]
    win_rate   = features.get('win_rate', 0.5)

    if _go_random(difficulty) or not last_moves:
        return {'ai_choice': random.choice(['HEADS', 'TAILS']), 'confidence': 0.5, 'strategy': 'random'}

    recent = last_moves[-6:]
    heads  = recent.count('HEADS')
    tails  = recent.count('TAILS')

    # Use win_rate as bias signal: high win_rate = player lucks on their habit
    if heads > tails:
        conf = round((heads / len(recent)) * (0.5 + win_rate * 0.5), 2)
        return {'ai_choice': 'TAILS', 'confidence': min(conf, 0.95), 'strategy': 'counter_streak'}
    elif tails > heads:
        conf = round((tails / len(recent)) * (0.5 + win_rate * 0.5), 2)
        return {'ai_choice': 'HEADS', 'confidence': min(conf, 0.95), 'strategy': 'counter_streak'}

    return {'ai_choice': random.choice(['HEADS', 'TAILS']), 'confidence': 0.5, 'strategy': 'random_tie'}


# ═══════════════════════════════════════════════════════
# GUESS THE NUMBER — Popularity-Avoidance + Weak-Spot
# ═══════════════════════════════════════════════════════
def ai_move_guess(features: dict) -> dict:
    """
    Node sends slot_counts = {0: 5, 1: 2, 2: 8, 3: 1} — how often each slot was guessed globally.
    Hard: always place answer on least-picked slot.
    Medium: weighted bias toward less-picked slots.
    Easy: random.
    """
    difficulty  = features.get('difficulty', 'hard')
    slot_counts = features.get('slot_counts', {})
    num_options = features.get('num_options', 4)

    if _go_random(difficulty):
        return {'ai_choice': random.randint(0, num_options - 1), 'confidence': 0.25, 'strategy': 'random'}

    if not slot_counts:
        return {'ai_choice': random.randint(0, num_options - 1), 'confidence': 0.25, 'strategy': 'random_no_data'}

    # Normalize keys to ints
    counts = {int(k): int(v) for k, v in slot_counts.items()}

    if difficulty.lower() == 'medium':
        # Weighted random: slots picked less get higher chance to be the answer
        total = sum(counts.values()) + len(counts)  # add 1 to each to avoid zero-weights
        weights = [1.0 / (counts.get(i, 0) + 1) for i in range(num_options)]
        w_sum = sum(weights)
        norm = [w / w_sum for w in weights]
        r = random.random()
        cumul = 0
        for i, w in enumerate(norm):
            cumul += w
            if r <= cumul:
                return {'ai_choice': i, 'confidence': round(w, 3), 'strategy': 'weighted_avoid'}

    least_picked = min(range(num_options), key=lambda i: counts.get(i, 0))
    total = sum(counts.values())
    confidence = round(1.0 - (counts.get(least_picked, 0) / max(total, 1)), 3)
    return {'ai_choice': least_picked, 'confidence': confidence, 'strategy': 'avoid_popular'}


# ═══════════════════════════════════════════════════════
# MINE THE GOLD — Frequency Trap + Streak Exploit
# ═══════════════════════════════════════════════════════
def ai_move_mine(features: dict) -> dict:
    """
    Node sends cell_freq = {0:3, 1:7, 2:1, ...} — global click frequency per cell.
    Hard: mines go on hottest cells.
    Medium: weighted toward hot cells.
    Easy: random.
    """
    difficulty   = features.get('difficulty', 'hard')
    mode         = features.get('mode', 'easy').lower()
    cell_freq    = features.get('cell_freq', {})
    total_cells  = features.get('total_cells', 9)
    mine_count   = {'easy': 1, 'medium': 2, 'hard': 3}.get(mode, 1)

    if _go_random(difficulty):
        return {
            'mine_cells': random.sample(range(total_cells), min(mine_count, total_cells)),
            'strategy': 'random', 'mine_count': mine_count
        }

    if not cell_freq:
        return {
            'mine_cells': random.sample(range(total_cells), min(mine_count, total_cells)),
            'strategy': 'random_no_data', 'mine_count': mine_count
        }

    freq = {int(k): int(v) for k, v in cell_freq.items()}

    if difficulty.lower() == 'medium':
        # Weighted sample: hotter cells have higher mine probability
        population = list(range(total_cells))
        weights = [freq.get(i, 0) + 1 for i in population]  # +1 avoids 0-weight
        chosen = set()
        while len(chosen) < mine_count:
            r = random.random() * sum(weights)
            cumul = 0
            for i, w in zip(population, weights):
                cumul += w
                if r <= cumul:
                    chosen.add(i)
                    break
        return {'mine_cells': list(chosen), 'strategy': 'weighted_trap', 'mine_count': mine_count}

    # Hard: top N hottest cells
    sorted_cells = sorted(freq, key=freq.get, reverse=True)
    mine_cells = sorted_cells[:mine_count]
    # Pad with random if not enough data
    if len(mine_cells) < mine_count:
        remaining = [c for c in range(total_cells) if c not in mine_cells]
        mine_cells += random.sample(remaining, mine_count - len(mine_cells))

    return {'mine_cells': mine_cells, 'strategy': 'frequency_trap', 'mine_count': mine_count}
