/**
 * Casinozz v2.0 AI Overlay & Event Tracking Module
 * Shared across all games to manage sessions and log events.
 */

const API_BASE = window.CASINOZZ_API || (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' 
    ? 'https://casinozz-backend.onrender.com/api' 
    : 'http://localhost:3000/api');

class CasinozzTracker {
    constructor(gameName) {
        this.game = gameName;
        this.sessionId = null;
        this.sessionKey = localStorage.getItem('casinozz_user') || localStorage.getItem('casinozz_session_key') || crypto.randomUUID();
        localStorage.setItem('casinozz_session_key', this.sessionKey);
        this.mode = 'easy'; // Wait for game init to set this properly
        this.moveIndex = 0;
        this.pendingEvents = [];
    }

    async startSession(mode) {
        if (this.sessionId && this.mode === (mode || 'easy')) {
            return this.sessionId;
        }
        if (this.sessionId) {
            const oldSessionId = this.sessionId;
            this.sessionId = null;
            await this.endSession(oldSessionId);
        }
        this.mode = mode || 'easy';
        try {
            const res = await fetch(`${API_BASE}/session/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    game: this.game,
                    mode: this.mode,
                    session_key: this.sessionKey
                })
            });
            const data = await res.json();
            this.sessionId = data.session_id;
            this.moveIndex = 0;
            console.log(`[AI Tracker] Session started for ${this.game} (ID: ${this.sessionId})`);
            const queued = [...this.pendingEvents];
            this.pendingEvents = [];
            queued.forEach((event) => this.logEvent(event.eventType, event.payload));
            return this.sessionId;
        } catch (err) {
            console.error('[AI Tracker] Failed to start session', err);
            return null;
        }
    }

    async endSession(sessionId = this.sessionId) {
        if (!sessionId) return;
        try {
            await fetch(`${API_BASE}/session/end`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId })
            });
        } catch (err) {
            console.warn('[AI Tracker] Failed to end session', err);
        } finally {
            if (this.sessionId === sessionId) this.sessionId = null;
        }
    }

    buildPayload(eventType, payload) {
        const moveEvents = new Set(['move', 'round_result', 'withdraw', 'mine_layout']);
        if (!moveEvents.has(eventType)) return payload || {};

        const base = {
            version: 1,
            game: this.game,
            mode: this.mode,
            session_key: this.sessionKey,
            move_index: this.moveIndex,
            occurred_at: new Date().toISOString(),
        };

        if (eventType === 'move') this.moveIndex += 1;
        return { ...base, ...(payload || {}) };
    }

    async logEvent(eventType, payload) {
        if (!this.sessionId && eventType !== 'init') {
            this.pendingEvents.push({ eventType, payload });
            return;
        }
        try {
            await fetch(`${API_BASE}/event`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    event_type: eventType,
                    payload: this.buildPayload(eventType, payload)
                })
            });
        } catch (err) {
            console.warn('[AI Tracker] Failed to log event', err);
        }
    }
}

window.CasinozzTracker = CasinozzTracker;
