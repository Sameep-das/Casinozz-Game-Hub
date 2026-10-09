"""
Casinozz ML Service — Hardened
───────────────────────────────────────────────────────────────
Security:
  1. INTERNAL_API_KEY — requests must provide x-api-key header
  2. Input validation on all endpoints
  3. No DB access (pure compute)
"""
import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

# Load environment variables from .env file
load_dotenv()

from models.rps_model import predict_rps
from models.mine_model import predict_mine
from clustering import cluster_player
from train import retrain_all_models
from adaptive_ai import ai_move_rps, ai_move_coin, ai_move_guess, ai_move_mine

app = Flask(__name__)

# BUGFIX: default '*' let any external site call the ML layer. Keep local dev and
# deployed frontend/backend origins explicit unless ALLOWED_ORIGINS overrides them.
ALLOWED_ORIGINS = [
    origin.strip() for origin in os.getenv(
        'ALLOWED_ORIGINS',
        'http://localhost:8080,http://127.0.0.1:8080,https://casinozz-v2.vercel.app,https://casinozz-backend.onrender.com'
    ).split(',')
    if origin.strip()
]
CORS(app, origins=ALLOWED_ORIGINS)

# ── Internal API Key — block unauthorized callers ────────────────────────────
INTERNAL_API_KEY = os.getenv('INTERNAL_API_KEY')


def _check_api_key():
    """Reject requests without a valid internal API key (when key is configured)."""
    if not INTERNAL_API_KEY:
        # Dev mode: no key required
        return None
    key = request.headers.get('x-api-key', '')
    if key != INTERNAL_API_KEY:
        return jsonify({'error': 'Unauthorized — invalid API key'}), 403
    return None


# ── Health Check (no auth needed) ──────────────────────────────────────────
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'service': 'python-ml'})

@app.route('/api/health', methods=['GET'])
def api_health():
    return jsonify({'status': 'healthy', 'service': 'python-ml'})


# ── Predict (RPS / Mine model) ─────────────────────────────────────────────
@app.route('/predict', methods=['POST'])
def predict():
    auth_err = _check_api_key()
    if auth_err:
        return auth_err

    data = request.json
    if not data or 'game' not in data:
        return jsonify({'error': 'Missing "game" field'}), 400

    game     = data.get('game')
    features = data.get('features', [])

    if not isinstance(features, list):
        return jsonify({'error': '"features" must be a list'}), 400

    if game == 'rps':
        return jsonify(predict_rps(features))
    if game == 'mine':
        return jsonify(predict_mine(features))
    return jsonify({'status': 'stub', 'game': game})


# ── Cluster Player ──────────────────────────────────────────────────────────
@app.route('/cluster', methods=['POST'])
def cluster():
    auth_err = _check_api_key()
    if auth_err:
        return auth_err

    data = request.json or {}
    features = data.get('features', [0.5, 0.5, 0.5, 0, 0.5, 0.5])
    if not isinstance(features, list) or len(features) != 6:
        return jsonify({'error': '"features" must be a list of 6 numbers'}), 400

    return jsonify(cluster_player(features))


# ── Train (retrain models from real data) ───────────────────────────────────
@app.route('/train', methods=['POST'])
def train_endpoint():
    auth_err = _check_api_key()
    if auth_err:
        return auth_err
    retrain_all_models()
    return jsonify({'status': 'ok'})


# ── AI Move (adaptive opponent — pure compute) ─────────────────────────────
@app.route('/ai_move', methods=['POST'])
def ai_move():
    """
    Expects: { "game": "rps|coin|guess|mine", "features": { ... } }
    Node.js sends enriched features dict. This service does NO DB access.
    """
    auth_err = _check_api_key()
    if auth_err:
        return auth_err

    data = request.json
    if not data or 'game' not in data:
        return jsonify({'error': 'Missing "game" field'}), 400

    game     = data.get('game', 'rps')
    features = data.get('features', {})

    if not isinstance(features, dict):
        return jsonify({'error': '"features" must be an object'}), 400

    VALID_GAMES = {'rps', 'coin', 'guess', 'mine'}
    if game not in VALID_GAMES:
        return jsonify({'error': f'Unknown game: {game}. Valid: {VALID_GAMES}'}), 400

    handlers = {
        'rps':   ai_move_rps,
        'coin':  ai_move_coin,
        'guess': ai_move_guess,
        'mine':  ai_move_mine,
    }
    result = handlers[game](features)
    return jsonify(result)


@app.route('/ai_batch', methods=['POST'])
def ai_batch():
    """
    Expects the canonical Node payload:
    {
      "game": "rps|coin|guess|mine",
      "features": {"last_moves": [...], ...},
      "queue_target": 10,
      "request_type": "move_batch|mine_withdrawal"
    }
    Returns counter_moves for the next turns, or mine_cells for Mine the Gold.
    """
    auth_err = _check_api_key()
    if auth_err:
        return auth_err

    data = request.json or {}
    game = data.get('game')
    features = data.get('features', {})
    queue_target = min(int(data.get('queue_target', 10) or 10), 10)

    if game not in {'rps', 'coin', 'guess', 'mine'}:
        return jsonify({'error': f'Unknown game: {game}'}), 400
    if not isinstance(features, dict):
        return jsonify({'error': '"features" must be an object'}), 400

    handlers = {
        'rps':   ai_move_rps,
        'coin':  ai_move_coin,
        'guess': ai_move_guess,
        'mine':  ai_move_mine,
    }

    if game == 'mine':
        result = handlers[game](features)
        result['request_type'] = data.get('request_type', 'mine_withdrawal')
        return jsonify(result)

    moves = []
    for _ in range(queue_target):
        result = handlers[game](features)
        moves.append(result.get('ai_choice'))

    return jsonify({
        'counter_moves': moves,
        'strategy': 'batched_counter',
        'batch_size': len(features.get('last_moves') or []),
        'queue_target': queue_target,
    })


if __name__ == '__main__':
    app.run(port=5001, debug=(os.getenv('FLASK_ENV') != 'production'))
