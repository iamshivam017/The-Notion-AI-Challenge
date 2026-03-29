import { getConfig } from '../config';
import type { NotionPage } from '../integrations/notion/sync';
import type { GitHubData, GitHubIssue } from '../integrations/github/sync';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface DerivedMetrics {
  staleTasks: NotionPage[];           // Not updated in 7+ days, not Done
  unlinkedIssues: GitHubIssue[];     // GitHub issues with no Notion task
  blockedItems: NotionPage[];         // Status === 'Blocked'
  overdueTasks: NotionPage[];         // Past due date, not Done
  velocity: number;                   // Tasks closed in last 7 days
  healthScore: number;                // 0–100 composite workspace health
  syncGapCount: number;               // Total cross-system gaps
}

export interface UnifiedContext {
  snapshotAt: string;
  notion: {
    pages: NotionPage[];
    databaseIds: string[];
    recentEdits: NotionPage[];         // Edited in last 7 days
  };
  github: GitHubData;
  derived: DerivedMetrics;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------
interface CacheEntry {
  context: UnifiedContext;
  builtAt: number;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(dbIds: string[]): string {
  return dbIds.slice().sort().join(',');
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------
export async function buildContext(
  notionPages: NotionPage[],
  githubData: GitHubData,
  forceRefresh = false,
): Promise<UnifiedContext> {
  const cfg = getConfig();
  const dbIds = cfg.NOTION_DATABASE_IDS;
  const key = cacheKey(dbIds);

  const cached = cache.get(key);
  if (
    !forceRefresh &&
    cached &&
    Date.now() - cached.builtAt < cfg.CONTEXT_CACHE_TTL_SECONDS * 1_000
  ) {
    return cached.context;
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const now = new Date().toISOString();

  // --- Derived: stale tasks
  const staleTasks = notionPages.filter(p =>
    p.status !== 'Done' &&
    p.status !== 'Cancelled' &&
    p.lastEdited < sevenDaysAgo,
  );

  // --- Derived: unlinked GitHub issues (no corresponding Notion page)
  const linkedUrls = new Set(
    notionPages.map(p => p.githubIssueUrl).filter(Boolean) as string[],
  );
  const unlinkedIssues = githubData.issues.filter(i => !linkedUrls.has(i.url));

  // --- Derived: blocked items
  const blockedItems = notionPages.filter(
    p => p.status === 'Blocked' || p.status === 'On Hold',
  );

  // --- Derived: overdue tasks
  const overdueTasks = notionPages.filter(p =>
    p.dueDate &&
    p.dueDate < now &&
    p.status !== 'Done' &&
    p.status !== 'Cancelled',
  );

  // --- Derived: velocity (tasks closed in 7 days)
  const velocity = notionPages.filter(
    p => p.status === 'Done' && p.lastEdited >= sevenDaysAgo,
  ).length;

  // --- Derived: sync gap count
  const syncGapCount = unlinkedIssues.length + staleTasks.length;

  // --- Derived: health score (0–100)
  const totalTasks = Math.max(notionPages.length, 1);
  const staleRatio = staleTasks.length / totalTasks;
  const blockedRatio = blockedItems.length / totalTasks;
  const overdueRatio = overdueTasks.length / totalTasks;
  const healthScore = Math.round(
    100 - staleRatio * 40 - blockedRatio * 30 - overdueRatio * 20 - Math.min(unlinkedIssues.length, 10) * 1,
  );

  const ctx: UnifiedContext = {
    snapshotAt: new Date().toISOString(),
    notion: {
      pages: notionPages,
      databaseIds: dbIds,
      recentEdits: notionPages.filter(p => p.lastEdited >= sevenDaysAgo),
    },
    github: githubData,
    derived: {
      staleTasks,
      unlinkedIssues,
      blockedItems,
      overdueTasks,
      velocity,
      healthScore: Math.max(0, Math.min(100, healthScore)),
      syncGapCount,
    },
  };

  cache.set(key, { context: ctx, builtAt: Date.now() });
  return ctx;
}

/** Force-invalidate the context cache (e.g. after a write action). */
export function invalidateContextCache(): void {
  cache.clear();
}
