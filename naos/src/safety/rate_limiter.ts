// ---------------------------------------------------------------------------
// Token-bucket rate limiter
// One limiter instance per external API — never shared across services.
// ---------------------------------------------------------------------------

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    /** Maximum tokens per minute */
    private readonly limitPerMinute: number,
    /** Allow short bursts up to limitPerMinute × burstMultiplier */
    private readonly burstMultiplier = 1.5,
  ) {}

  async acquire(key = 'default'): Promise<void> {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.limitPerMinute, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // Refill proportionally to elapsed time
    const elapsedMinutes = (now - bucket.lastRefill) / 60_000;
    bucket.tokens = Math.min(
      this.limitPerMinute * this.burstMultiplier,
      bucket.tokens + elapsedMinutes * this.limitPerMinute,
    );
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      const waitMs = Math.ceil(((1 - bucket.tokens) / this.limitPerMinute) * 60_000);
      console.debug(`[RateLimiter:${key}] Throttling — waiting ${waitMs}ms`);
      await new Promise<void>(r => setTimeout(r, waitMs));
    }
    bucket.tokens -= 1;
  }
}

// One limiter per API — these are module singletons
export const notionLimiter = new RateLimiter(3);   // Notion: 3 req/s (180/min)
export const githubLimiter = new RateLimiter(30);  // GitHub: 5000/hr → ~83/min; be conservative
export const claudeLimiter = new RateLimiter(10);  // Claude: conservative default
