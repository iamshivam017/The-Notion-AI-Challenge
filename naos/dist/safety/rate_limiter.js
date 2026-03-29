"use strict";
// ---------------------------------------------------------------------------
// Token-bucket rate limiter
// One limiter instance per external API — never shared across services.
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeLimiter = exports.githubLimiter = exports.notionLimiter = exports.RateLimiter = void 0;
class RateLimiter {
    limitPerMinute;
    burstMultiplier;
    buckets = new Map();
    constructor(
    /** Maximum tokens per minute */
    limitPerMinute, 
    /** Allow short bursts up to limitPerMinute × burstMultiplier */
    burstMultiplier = 1.5) {
        this.limitPerMinute = limitPerMinute;
        this.burstMultiplier = burstMultiplier;
    }
    async acquire(key = 'default') {
        const now = Date.now();
        let bucket = this.buckets.get(key);
        if (!bucket) {
            bucket = { tokens: this.limitPerMinute, lastRefill: now };
            this.buckets.set(key, bucket);
        }
        // Refill proportionally to elapsed time
        const elapsedMinutes = (now - bucket.lastRefill) / 60_000;
        bucket.tokens = Math.min(this.limitPerMinute * this.burstMultiplier, bucket.tokens + elapsedMinutes * this.limitPerMinute);
        bucket.lastRefill = now;
        if (bucket.tokens < 1) {
            const waitMs = Math.ceil(((1 - bucket.tokens) / this.limitPerMinute) * 60_000);
            console.debug(`[RateLimiter:${key}] Throttling — waiting ${waitMs}ms`);
            await new Promise(r => setTimeout(r, waitMs));
        }
        bucket.tokens -= 1;
    }
}
exports.RateLimiter = RateLimiter;
// One limiter per API — these are module singletons
exports.notionLimiter = new RateLimiter(3); // Notion: 3 req/s (180/min)
exports.githubLimiter = new RateLimiter(30); // GitHub: 5000/hr → ~83/min; be conservative
exports.claudeLimiter = new RateLimiter(10); // Claude: conservative default
//# sourceMappingURL=rate_limiter.js.map