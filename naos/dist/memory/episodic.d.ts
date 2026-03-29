/**
 * Episodic memory — stores events from the current run in-process.
 * Cleared between runs. Used so agents can avoid duplicate actions within a run.
 */
export interface EpisodicEvent {
    timestamp: string;
    type: string;
    entityId: string;
    detail: string;
}
export declare function remember(type: string, entityId: string, detail: string): void;
export declare function recall(type?: string, entityId?: string): EpisodicEvent[];
export declare function hasActedOn(entityId: string, type?: string): boolean;
export declare function clearEpisodicMemory(): void;
export declare function episodicSummary(): string;
//# sourceMappingURL=episodic.d.ts.map