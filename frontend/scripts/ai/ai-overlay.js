/**
 * Casinozz v2.0 AI Overlay & Event Tracking Module
 * Shared across all games to manage sessions and log events.
 */

const API_BASE = window.CASINOZZ_API || 'http://localhost:3000/api';

class CasinozzTracker {
    constructor(gameName) {
        this.game = gameName;
        this.sessionId = null;
        this.sessionKey = localStorage.getItem('casinozz_user') || crypto.randomUUID();
        this.mode = 'easy'; // Wait for game init to set this properly
    }

    async startSession(mode) {
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
            console.log(`[AI Tracker] Session started for ${this.game} (ID: ${this.sessionId})`);
        } catch (err) {
            console.error('[AI Tracker] Failed to start session', err);
        }
    }

    async logEvent(eventType, payload) {
        if (!this.sessionId && eventType !== 'init') {
            console.warn('[AI Tracker] Cannot log event: no active session.');
            return;
        }
        try {
            await fetch(`${API_BASE}/event`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    event_type: eventType,
                    payload: payload
                })
            });
        } catch (err) {
            console.warn('[AI Tracker] Failed to log event', err);
        }
    }
}

window.CasinozzTracker = CasinozzTracker;
