import type { UnifiedContext } from './builder';

export interface ContextDiff {
  newPages: string[];
  removedPages: string[];
  statusChanges: Array<{ id: string; from?: string; to?: string }>;
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
export function diffContexts(prev: UnifiedContext, next: UnifiedContext): ContextDiff {
  const prevPageMap = new Map(prev.notion.pages.map(p => [p.id, p]));
  const nextPageMap = new Map(next.notion.pages.map(p => [p.id, p]));

  // New pages
  const newPages = [...nextPageMap.keys()].filter(id => !prevPageMap.has(id));

  // Removed pages
  const removedPages = [...prevPageMap.keys()].filter(id => !nextPageMap.has(id));

  // Status changes
  const statusChanges: ContextDiff['statusChanges'] = [];
  for (const [id, nextPage] of nextPageMap) {
    const prevPage = prevPageMap.get(id);
    if (prevPage && prevPage.status !== nextPage.status) {
      statusChanges.push({ id, from: prevPage.status, to: nextPage.status });
    }
  }

  // GitHub issue changes
  const prevIssueNums = new Set(prev.github.issues.map(i => i.number));
  const nextIssueNums = new Set(next.github.issues.map(i => i.number));
  const newIssues = [...nextIssueNums].filter(n => !prevIssueNums.has(n));
  const closedIssues = [...prevIssueNums].filter(n => !nextIssueNums.has(n));

  const healthDelta = next.derived.healthScore - prev.derived.healthScore;
  const velocityDelta = next.derived.velocity - prev.derived.velocity;

  // Significant if any structural change or health dropped >5 points
  const hasSignificantChanges =
    newPages.length > 0 ||
    removedPages.length > 0 ||
    statusChanges.length > 0 ||
    newIssues.length > 0 ||
    healthDelta < -5;

  return {
    newPages,
    removedPages,
    statusChanges,
    newIssues,
    closedIssues,
    healthDelta,
    velocityDelta,
    hasSignificantChanges,
  };
}
