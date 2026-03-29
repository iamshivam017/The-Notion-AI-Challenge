"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildContext = buildContext;
exports.invalidateContextCache = invalidateContextCache;
const config_1 = require("../config");
const cache = new Map();
function cacheKey(dbIds) {
    return dbIds.slice().sort().join(',');
}
// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------
async function buildContext(notionPages, githubData, forceRefresh = false) {
    const cfg = (0, config_1.getConfig)();
    const dbIds = cfg.NOTION_DATABASE_IDS;
    const key = cacheKey(dbIds);
    const cached = cache.get(key);
    if (!forceRefresh &&
        cached &&
        Date.now() - cached.builtAt < cfg.CONTEXT_CACHE_TTL_SECONDS * 1_000) {
        return cached.context;
    }
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const now = new Date().toISOString();
    // --- Derived: stale tasks
    const staleTasks = notionPages.filter(p => p.status !== 'Done' &&
        p.status !== 'Cancelled' &&
        p.lastEdited < sevenDaysAgo);
    // --- Derived: unlinked GitHub issues (no corresponding Notion page)
    const linkedUrls = new Set(notionPages.map(p => p.githubIssueUrl).filter(Boolean));
    const unlinkedIssues = githubData.issues.filter(i => !linkedUrls.has(i.url));
    // --- Derived: blocked items
    const blockedItems = notionPages.filter(p => p.status === 'Blocked' || p.status === 'On Hold');
    // --- Derived: overdue tasks
    const overdueTasks = notionPages.filter(p => p.dueDate &&
        p.dueDate < now &&
        p.status !== 'Done' &&
        p.status !== 'Cancelled');
    // --- Derived: velocity (tasks closed in 7 days)
    const velocity = notionPages.filter(p => p.status === 'Done' && p.lastEdited >= sevenDaysAgo).length;
    // --- Derived: sync gap count
    const syncGapCount = unlinkedIssues.length + staleTasks.length;
    // --- Derived: health score (0–100)
    const totalTasks = Math.max(notionPages.length, 1);
    const staleRatio = staleTasks.length / totalTasks;
    const blockedRatio = blockedItems.length / totalTasks;
    const overdueRatio = overdueTasks.length / totalTasks;
    const healthScore = Math.round(100 - staleRatio * 40 - blockedRatio * 30 - overdueRatio * 20 - Math.min(unlinkedIssues.length, 10) * 1);
    const ctx = {
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
function invalidateContextCache() {
    cache.clear();
}
//# sourceMappingURL=builder.js.map