import type { UnifiedContext } from './builder';
export interface ContextDiff {
    newPages: string[];
    removedPages: string[];
    statusChanges: Array<{
        id: string;
        from?: string;
        to?: string;
    }>;
    newIssues: number[];
    closedIssues: number[];
    healthDelta: number;
    velocityDelta: number;
    hasSignificantChanges: boolean;
}
/**
 * Computes a diff between two context snapshots.
 * Used by the orchestrator to decide whether a full re-run is warranted.
 */
export declare function diffContexts(prev: UnifiedContext, next: UnifiedContext): ContextDiff;
//# sourceMappingURL=diff_engine.d.ts.map