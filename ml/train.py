"""
train.py — Real Data Training Pipeline
════════════════════════════════════════════════════════════════
Trains the Mine model and Cluster model using REAL player event
data from the database (passed in by Node at /train endpoint),
falling back to synthetic data only if real data is insufficient.
"""

import os
import numpy as np
from models.mine_model import train_mine_model
from clustering import train_cluster_model


def _get_db():
    """DB connection using env vars. Called only during training (not per-request)."""
    import mysql.connector
    url = os.environ.get("DATABASE_URL")
    if url:
        from urllib.parse import urlparse
        u = urlparse(url)
        return mysql.connector.connect(
            host=u.hostname, port=u.port or 3306,
            user=u.username, password=u.password,
            database=u.path.lstrip("/"),
            ssl_disabled=False
        )
    return mysql.connector.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        user=os.environ.get("DB_USER", "root"),
        password=os.environ.get("DB_PASSWORD", ""),
        database=os.environ.get("DB_NAME", "casinozz_v2")
    )


def _fetch_mine_data():
    """
    Fetch real Mine the Gold event data from DB.
    Returns (X, y) where X = feature vectors, y = labels (1=safe, 0=mine).
    """
    import json
    try:
        conn = _get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT e.payload, s.mode
            FROM events e
            JOIN sessions s ON e.session_id = s.id
            WHERE e.event_type = 'result' AND s.game = 'mine'
            ORDER BY e.id DESC LIMIT 1000
        """)
        rows = cursor.fetchall()
        cursor.close(); conn.close()

        X, y = [], []
        mode_enc = {'EASY': 0, 'MEDIUM': 1, 'HARD': 2}
        for row in rows:
            try:
                p = row['payload'] if isinstance(row['payload'], dict) else json.loads(row['payload'])
                mode    = mode_enc.get((row['mode'] or 'EASY').upper(), 0)
                cells   = int(p.get('cells_revealed', 0))
                outcome = 1 if str(p.get('outcome', '')).lower() == 'win' else 0
                X.append([mode, cells, 9 - cells, 1.2 + cells * 0.3, mode + 1, 0])
                y.append(outcome)
            except Exception:
                continue

        print(f"[train] Mine: fetched {len(X)} real samples from DB")
        return X, y
    except Exception as e:
        print(f"[train] DB error for mine data: {e}")
        return [], []


def _fetch_cluster_data():
    """
    Fetch real player session features for clustering.
    Returns list of feature vectors [win_rate, avg_risk, withdraw_ratio, streak, diversity, duration].
    """
    import json
    try:
        conn = _get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                s.session_key,
                s.game,
                s.mode,
                COUNT(*) as total,
                SUM(CASE WHEN JSON_EXTRACT(e.payload,'$.outcome')='"win"' THEN 1 ELSE 0 END) as wins
            FROM events e
            JOIN sessions s ON e.session_id = s.id
            WHERE e.event_type = 'result'
            GROUP BY s.session_key, s.game, s.mode
        """)
        rows = cursor.fetchall()
        cursor.close(); conn.close()

        X = []
        mode_risk = {'EASY': 0.2, 'MEDIUM': 0.5, 'HARD': 0.9}
        for row in rows:
            total = int(row['total']) or 1
            wins  = int(row['wins']) or 0
            X.append([
                round(wins / total, 3),                         # win_rate
                mode_risk.get((row['mode'] or '').upper(), 0.5), # avg_risk
                0.0,                                             # withdraw_ratio (todo)
                min(wins, 10),                                   # streak_max proxy
                0.5,                                             # choice_diversity
                min(total / 100.0, 1.0)                         # session_duration proxy
            ])

        print(f"[train] Cluster: fetched {len(X)} real samples from DB")
        return X
    except Exception as e:
        print(f"[train] DB error for cluster data: {e}")
        return []


def _synthetic_mine(n=500):
    """Fallback synthetic data for mine model."""
    import random
    X, y = [], []
    for _ in range(n):
        mode = random.randint(0, 2)
        revealed = random.randint(0, 8)
        X.append([mode, revealed, 9 - revealed,
                  1.2 + revealed * 0.3, random.randint(1, 3), random.randint(0, 5)])
        y.append(1 if (revealed < 5 and random.random() > 0.2) else 0)
    return X, y


def retrain_all_models():
    print("\n[train] ══ Starting retraining pipeline ══")

    # ── Mine Model ──────────────────────────────────────────────────────────
    X_mine, y_mine = _fetch_mine_data()
    if len(X_mine) < 50:
        print(f"[train] Mine: only {len(X_mine)} real samples, augmenting with synthetic data")
        X_syn, y_syn = _synthetic_mine(max(0, 200 - len(X_mine)))
        X_mine = X_mine + X_syn
        y_mine = y_mine + y_syn
    train_mine_model(X_mine, y_mine)
    print(f"[train] Mine model trained on {len(X_mine)} samples")

    # ── Cluster Model ────────────────────────────────────────────────────────
    X_clusters = _fetch_cluster_data()
    if len(X_clusters) < 20:
        print(f"[train] Cluster: only {len(X_clusters)} real samples, augmenting with synthetic data")
        X_syn = np.random.rand(max(0, 50 - len(X_clusters)), 6).tolist()
        X_clusters = X_clusters + X_syn
    train_cluster_model(X_clusters)
    print(f"[train] Cluster model trained on {len(X_clusters)} samples")

    print("[train] ══ Retraining complete ══\n")
    return True


if __name__ == '__main__':
    retrain_all_models()
