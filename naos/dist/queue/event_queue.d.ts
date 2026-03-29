export interface QueuedEvent {
    id: string;
    source: 'github_webhook' | 'notion_webhook' | 'scheduler' | 'manual';
    type: string;
    payload: unknown;
    enqueuedAt: string;
}
export declare function enqueue(event: Omit<QueuedEvent, 'id' | 'enqueuedAt'>): Promise<void>;
export declare function dequeue(): Promise<QueuedEvent | null>;
export declare function queueLength(): Promise<number>;
export declare function drainQueue(): Promise<QueuedEvent[]>;
export declare function closeRedis(): Promise<void>;
//# sourceMappingURL=event_queue.d.ts.map