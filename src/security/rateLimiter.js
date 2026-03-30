// RateLimiter — Per-API rate limit tracking with automatic backoff and queuing

export class RateLimiter {
  constructor() {
    this.limits = new Map();
    this.queues = new Map();

    // Default limits
    this.setLimit('notion', { maxRequests: 3, windowMs: 1000, remaining: 3, resetAt: Date.now() + 1000 });
    this.setLimit('github', { maxRequests: 5000, windowMs: 3600000, remaining: 5000, resetAt: Date.now() + 3600000 });
    this.setLimit('api', { maxRequests: 100, windowMs: 60000, remaining: 100, resetAt: Date.now() + 60000 });
  }

  setLimit(name, config) {
    this.limits.set(name, {
      ...config,
      requests: [],
    });
  }

  // Check if a request can proceed
  canProceed(name) {
    const limit = this.limits.get(name);
    if (!limit) return true;

    // Clean old requests
    const now = Date.now();
    limit.requests = limit.requests.filter(t => now - t < limit.windowMs);

    return limit.requests.length < limit.maxRequests;
  }

  // Record a request
  recordRequest(name) {
    const limit = this.limits.get(name);
    if (!limit) return;
    limit.requests.push(Date.now());
    limit.remaining = Math.max(0, limit.maxRequests - limit.requests.length);
  }

  // Get wait time in ms if rate limited
  getWaitTime(name) {
    const limit = this.limits.get(name);
    if (!limit || this.canProceed(name)) return 0;

    const oldestRequest = limit.requests[0];
    return oldestRequest + limit.windowMs - Date.now();
  }

  // Get status for all rate limits
  getStatus() {
    const status = {};
    for (const [name, limit] of this.limits) {
      const now = Date.now();
      const recentRequests = limit.requests.filter(t => now - t < limit.windowMs).length;
      status[name] = {
        maxRequests: limit.maxRequests,
        windowMs: limit.windowMs,
        used: recentRequests,
        remaining: limit.maxRequests - recentRequests,
        percentUsed: ((recentRequests / limit.maxRequests) * 100).toFixed(1),
      };
    }
    return status;
  }
}
