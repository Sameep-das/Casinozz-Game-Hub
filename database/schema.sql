-- ══════════════════════════════════════════════════════════════
-- Casinozz v2 — Full Database Schema
-- ══════════════════════════════════════════════════════════════
-- NOTE FOR PLANETSCALE DEPLOYMENT:
--   PlanetScale creates the DB for you.
--   Remove or comment out "CREATE DATABASE" and "USE" lines below
--   before pasting into the PlanetScale console.
-- ══════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS casinozz_v2;
USE casinozz_v2;

-- ── Auth ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Session Tracking ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    game        VARCHAR(30) NOT NULL,
    mode        VARCHAR(10) NOT NULL,
    session_key VARCHAR(36) NOT NULL,
    started_at  DATETIME    NOT NULL,
    ended_at    DATETIME    NULL
);

-- ── Game Events ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT         NOT NULL,
    event_type VARCHAR(30) NOT NULL,
    payload    JSON        NOT NULL,
    created_at DATETIME    NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- ── Aggregate Stats ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_stats (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    game         VARCHAR(30) NOT NULL,
    mode         VARCHAR(10) NOT NULL,
    result       VARCHAR(10) NOT NULL,
    duration_sec INT         NOT NULL,
    extra        JSON        NULL,
    created_at   DATETIME    NOT NULL
);

-- ── Simulation Results ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS simulation_results (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    game          VARCHAR(30)    NOT NULL,
    mode          VARCHAR(10)    NOT NULL,
    strategy      VARCHAR(40)    NOT NULL,
    simulations_n INT            NOT NULL,
    win_rate      DECIMAL(5,4)   NOT NULL,
    avg_score     DECIMAL(10,4)  NOT NULL,
    details       JSON           NOT NULL,
    ran_at        DATETIME       NOT NULL
);

-- ── Player Profiles / Clusters ────────────────────────────────
CREATE TABLE IF NOT EXISTS player_clusters (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    session_key   VARCHAR(36) NOT NULL,
    cluster_id    INT         NOT NULL,
    profile_label VARCHAR(40) NOT NULL,
    feature_vec   JSON        NOT NULL,
    assigned_at   DATETIME    NOT NULL
);

