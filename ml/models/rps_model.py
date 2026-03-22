
# No DB connection needed — pure compute
# We use the features passed from Node (global_moves + last_moves)

COUNTERS = { 'rock': 'paper', 'paper': 'scissors', 'scissors': 'rock', 
            'ROCK': 'PAPER', 'PAPER': 'SCISSORS', 'SCISSORS': 'ROCK' }

def predict_rps(features):
    """
    Standardize to take the list of features (moves) from the backend.
    features is expected to be a list of player moves.
    """
    if not isinstance(features, list):
        return { 'recommended_move': 'PAPER', 'confidence': 0.33, 'model': 'fallback' }
        
    last_moves = [m.upper() for m in features]
    
    if len(last_moves) < 2:
        return { 'recommended_move': 'PAPER', 'confidence': 0.33, 'model': 'frequency' }

    counts = { 'ROCK': 0, 'PAPER': 0, 'SCISSORS': 0 }
    
    # Simple bigram frequency from the provided features
    # (Node already sends up to 300 global moves + session moves)
    last = last_moves[-1]
    for i in range(len(last_moves) - 1):
        if last_moves[i] == last and last_moves[i+1] in counts:
            counts[last_moves[i+1]] += 1

    total = sum(counts.values())
    if total == 0:
        import random
        rnd = random.choice(['ROCK', 'PAPER', 'SCISSORS'])
        return { 'recommended_move': COUNTERS[rnd], 'confidence': 0.33, 'model': 'random' }

    predicted_next = max(counts, key=counts.get)
    best_counter = COUNTERS[predicted_next]
    
    return {
        'recommended_move': best_counter,
        'confidence': round(counts[predicted_next] / total, 3),
        'model': 'frequency'
    }
