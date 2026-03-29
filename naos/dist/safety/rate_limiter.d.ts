export declare class RateLimiter {
    /** Maximum tokens per minute */
    private readonly limitPerMinute;
    /** Allow short bursts up to limitPerMinute × burstMultiplier */
    private readonly burstMultiplier;
    private readonly buckets;
    constructor(
    /** Maximum tokens per minute */
    limitPerMinute: number, 
    /** Allow short bursts up to limitPerMinute × burstMultiplier */
    burstMultiplier?: number);
    acquire(key?: string): Promise<void>;
}
export declare const notionLimiter: RateLimiter;
export declare const githubLimiter: RateLimiter;
export declare const claudeLimiter: RateLimiter;
//# sourceMappingURL=rate_limiter.d.ts.map