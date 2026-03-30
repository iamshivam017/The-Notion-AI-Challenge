// EventBus — Pub/sub event system for inter-agent communication and dashboard updates

export class EventBus {
  constructor() {
    this.listeners = new Map();
    this.history = [];
    this.maxHistory = 200;
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const cbs = this.listeners.get(event).filter(cb => cb !== callback);
    this.listeners.set(event, cbs);
  }

  emit(event, data = {}) {
    const entry = {
      event,
      data,
      timestamp: Date.now(),
    };

    this.history.push(entry);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    const callbacks = this.listeners.get(event) || [];
    const wildcardCallbacks = this.listeners.get('*') || [];

    for (const cb of [...callbacks, ...wildcardCallbacks]) {
      try {
        cb(entry);
      } catch (err) {
        console.error(`EventBus error in handler for "${event}":`, err);
      }
    }
  }

  getHistory(limit = 50) {
    return this.history.slice(-limit);
  }

  clear() {
    this.listeners.clear();
    this.history = [];
  }
}
