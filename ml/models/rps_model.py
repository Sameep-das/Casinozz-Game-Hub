import mysql.connector

def get_db_connection():
    return mysql.connector.connect(
        host="localhost", user="root", password="", database="casinozz_v2"
    )

COUNTERS = { 'rock': 'paper', 'paper': 'scissors', 'scissors': 'rock' }

def predict_rps(last_moves):
    # last_moves e.g. ['rock', 'paper', 'rock', 'rock']
    if len(last_moves) < 2:
        return { 'recommended_move': 'paper', 'confidence': 0.33, 'model': 'frequency' }

    counts = { 'rock': 0, 'paper': 0, 'scissors': 0 }
    
    # Try to calculate from DB for all players' histories if not enough in current session
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT payload FROM events WHERE event_type='result' ORDER BY id DESC LIMIT 100")
        rows = cursor.fetchall()
        import json
        db_moves = [json.loads(r['payload'])['playerChoice'] for r in rows if 'playerChoice' in json.loads(r['payload'])]
        
        # simple bigram frequency
        seq = db_moves + last_moves
        for i in range(len(seq) - 1):
            if seq[i] == last_moves[-1]:
                counts[seq[i+1]] += 1
                
        cursor.close()
        conn.close()
    except Exception as e:
        print("DB error in rps_model:", e)
        # Fallback to just last_moves frequency if DB fails
        for i in range(len(last_moves) - 1):
            if last_moves[i] == last_moves[-1]:
                counts[last_moves[i+1]] += 1

    total = sum(counts.values())
    if total == 0:
        import random
        rnd = random.choice(['rock', 'paper', 'scissors'])
        return { 'recommended_move': COUNTERS[rnd], 'confidence': 0.33, 'model': 'random' }

    predicted_next = max(counts, key=counts.get)
    best_counter = COUNTERS[predicted_next]
    
    return {
        'recommended_move': best_counter,
        'confidence': round(counts[predicted_next] / total, 3),
        'model': 'frequency'
    }
