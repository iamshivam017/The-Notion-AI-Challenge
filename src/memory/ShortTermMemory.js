// ShortTermMemory — In-memory store with TTL eviction
// Used for immediate decision-making: current tasks, active contexts, recent outputs

export class ShortTermMemory {
  constructor() {
    this.store = new Map();
    this.timers = new Map();
    this.defaultTTL = 30 * 60 * 1000; // 30 minutes
    this.stats = { writes: 0, reads: 0, evictions: 0 };
  }

  store_entry(key, data, { ttl = this.defaultTTL, source = 'system' } = {}) {
    // Clear existing timer if overwriting
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    const entry = {
      key,
      data,
      source,
      createdAt: Date.now(),
      ttl,
      accessCount: 0,
    };

    this.store.set(key, entry);
    this.stats.writes++;

    // Set eviction timer
    const timer = setTimeout(() => {
      this.store.delete(key);
      this.timers.delete(key);
      this.stats.evictions++;
    }, ttl);

    this.timers.set(key, timer);
    return entry;
  }

  get(key) {
    const entry = this.store.get(key);
    if (entry) {
      entry.accessCount++;
      this.stats.reads++;
      return entry.data;
    }
    return null;
  }

  has(key) {
    return this.store.has(key);
  }

  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    return this.store.delete(key);
  }

  query(filter = {}) {
    const results = [];
    for (const [, entry] of this.store) {
      let match = true;
      if (filter.source && entry.source !== filter.source) match = false;
      if (filter.prefix && !entry.key.startsWith(filter.prefix)) match = false;
      if (filter.since && entry.createdAt < filter.since) match = false;
      if (match) results.push({ ...entry });
    }
    return results;
  }

  getAll() {
    return Array.from(this.store.values()).map(e => ({ ...e }));
  }

  clear() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.store.clear();
    this.timers.clear();
  }

  getStats() {
    return {
      ...this.stats,
      size: this.store.size,
      activeTimers: this.timers.size,
    };
  }

  destroy() {
    this.clear();
  }
}
