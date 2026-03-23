-- ══════════════════════════════════════════════════════════════
-- Casinozz v2 — PostgreSQL 17 Schema (Neon)
-- ══════════════════════════════════════════════════════════════
-- Paste this directly into the Neon SQL Editor.
-- ══════════════════════════════════════════════════════════════

-- ── Auth ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50)  UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Session Tracking ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
    id          SERIAL PRIMARY KEY,
    game        VARCHAR(30) NOT NULL,
    mode        VARCHAR(10) NOT NULL,
    session_key VARCHAR(255) NOT NULL,
    started_at  TIMESTAMPTZ DEFAULT NOW(),
    ended_at    TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_key ON sessions(session_key);

-- ── Game Events ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
    id         SERIAL PRIMARY KEY,
    session_id INTEGER     NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(30) NOT NULL,
    payload    JSONB       NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);

-- ── Aggregate Stats ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_stats (
    id           SERIAL PRIMARY KEY,
    game         VARCHAR(30) NOT NULL,
    mode         VARCHAR(10) NOT NULL,
    result       VARCHAR(10) NOT NULL,
    duration_sec INTEGER     NOT NULL,
    extra        JSONB       NULL,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Simulation Results ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS simulation_results (
    id            SERIAL PRIMARY KEY,
    game          VARCHAR(30)      NOT NULL,
    mode          VARCHAR(10)      NOT NULL,
    strategy      VARCHAR(40)      NOT NULL,
    simulations_n INTEGER          NOT NULL,
    win_rate      DOUBLE PRECISION NOT NULL,
    avg_score     DOUBLE PRECISION NOT NULL,
    details       JSONB            NOT NULL DEFAULT '{}',
    ran_at        TIMESTAMPTZ      DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sim_game ON simulation_results(game, mode);

-- ── Player Profiles / Clusters ────────────────────────────────
CREATE TABLE IF NOT EXISTS player_clusters (
    id            SERIAL PRIMARY KEY,
    session_key   VARCHAR(255) NOT NULL,
    cluster_id    INTEGER      NOT NULL,
    profile_label VARCHAR(40)  NOT NULL,
    feature_vec   JSONB        NOT NULL DEFAULT '[]',
    assigned_at   TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clusters_key ON player_clusters(session_key);
