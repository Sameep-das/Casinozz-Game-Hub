(function () {
  const API_BASE = window.CASINOZZ_API || "http://localhost:3000/api";
  const WORKER_URL = new URL("./ai-move-worker.js", document.currentScript.src);
  const RPS_CHOICES = ["ROCK", "PAPER", "SCISSOR"];
  const COIN_CHOICES = ["HEADS", "TAILS"];
  let requestSeq = 0;

  function randomInt(max) {
    return Math.floor(Math.random() * max);
  }

  function uniqueCells(totalCells, count) {
    const cells = new Set();
    while (cells.size < Math.min(totalCells, count)) {
      cells.add(randomInt(totalCells));
    }
    return [...cells];
  }

  function normalizeRpsMove(move) {
    return move === "SCISSORS" ? "SCISSOR" : move;
  }

  function fallbackMove(game, context = {}) {
    if (game === "rps") return RPS_CHOICES[randomInt(RPS_CHOICES.length)];
    if (game === "coin") return COIN_CHOICES[randomInt(COIN_CHOICES.length)];
    if (game === "guess") return randomInt(context.numOptions || 1);
    if (game === "mine") {
      const mode = (context.mode || "easy").toLowerCase();
      const mineCount = { easy: 1, medium: 2, hard: 3 }[mode] || 1;
      return uniqueCells(context.totalCells || 9, mineCount);
    }
    return null;
  }

  class AiQueue {
    constructor({ game, tracker, batchSize = 5, queueTarget = 10, timeoutMs = 3500 }) {
      this.game = game;
      this.tracker = tracker;
      this.batchSize = batchSize;
      this.queueTarget = queueTarget;
      this.timeoutMs = timeoutMs;
      this.mode = "easy";
      this.moves = [];
      this.queue = [];
      this.inFlight = false;
      this.worker = window.Worker ? new Worker(WORKER_URL) : null;
      this.pending = new Map();

      if (this.worker) {
        this.worker.onmessage = (event) => this.handleWorkerMessage(event.data || {});
      }
    }

    setMode(mode) {
      this.mode = (mode || "easy").toLowerCase();
      this.queue = [];
    }

    recordPlayerMove(move) {
      if (move === undefined || move === null || move === "") return;
      this.moves.push(move);
      if (this.moves.length > 30) this.moves.shift();
      if (this.game !== "mine") this.prefetch();
    }

    nextMove(context = {}) {
      const mode = (context.mode || this.mode || "easy").toLowerCase();
      if (mode === "easy") return fallbackMove(this.game, { ...context, mode });

      const queued = this.queue.shift();
      this.prefetch(context);

      if (queued !== undefined) {
        return this.game === "rps" ? normalizeRpsMove(queued) : queued;
      }
      return fallbackMove(this.game, { ...context, mode });
    }

    requestMinePlan(context = {}) {
      const mode = (context.mode || this.mode || "easy").toLowerCase();
      if (mode === "easy") return;
      this.prefetch({ ...context, force: true, mode, requestType: "mine_withdrawal" });
    }

    prefetch(context = {}) {
      const mode = (context.mode || this.mode || "easy").toLowerCase();
      if (mode === "easy" || this.inFlight || this.queue.length >= this.queueTarget) return;
      if (!context.force && this.moves.length < this.batchSize) return;

      const lastMoves = this.moves.slice(-this.batchSize);
      if (this.game !== "mine" && lastMoves.length < this.batchSize) return;

      const requestId = ++requestSeq;
      const payload = {
        game: this.game,
        mode,
        difficulty: mode,
        session_id: this.tracker && this.tracker.sessionId,
        session_key: this.tracker && this.tracker.sessionKey,
        request_type: context.requestType || "move_batch",
        batch_size: this.batchSize,
        queue_target: this.queueTarget,
        events: lastMoves.map((move, index) => ({
          type: "move",
          actor: "player",
          move,
          index,
        })),
        context,
      };

      this.inFlight = true;
      this.pending.set(requestId, true);

      if (!this.worker) {
        this.inFlight = false;
        return;
      }

      this.worker.postMessage({
        requestId,
        endpoint: `${API_BASE}/ml/ai_batch`,
        payload,
        timeoutMs: this.timeoutMs,
      });
    }

    handleWorkerMessage(message) {
      if (!this.pending.has(message.requestId)) return;
      this.pending.delete(message.requestId);
      this.inFlight = false;

      if (!message.ok || !message.data) return;

      if (this.game === "mine" && Array.isArray(message.data.mine_cells)) {
        this.queue.push(message.data.mine_cells);
        return;
      }

      const moves = message.data.counter_moves || message.data.moves || [];
      moves.forEach((move) => {
        if (this.queue.length < this.queueTarget) {
          this.queue.push(this.game === "rps" ? normalizeRpsMove(move) : move);
        }
      });
    }
  }

  window.CasinozzAI = {
    create(options) {
      return new AiQueue(options);
    },
    fallbackMove,
  };
})();
