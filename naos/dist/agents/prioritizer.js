"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrioritizerAgent = void 0;
const semantic_1 = require("../memory/semantic");
const DEFAULT_WEIGHTS = {
    priorityBase: { critical: 50, high: 35, medium: 18, low: 5 },
    impactMultiplier: 0.35,
    stalenessBonus: 6,
    syncGapBonus: 12,
    recencyBonus: 8,
    blockedPenalty: -5,
    overdueBonus: 15,
};
class PrioritizerAgent {
    getWeights() {
        return (0, semantic_1.semanticGet)('prioritizer.weights') ?? DEFAULT_WEIGHTS;
    }
    async rank(tasks, context) {
        const weights = this.getWeights();
        const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
        const scored = tasks.map(task => {
            const breakdown = {};
            // Base priority
            breakdown.priority = weights.priorityBase[task.priority] ?? 0;
            // Impact
            breakdown.impact = task.estimatedImpact * weights.impactMultiplier;
            // Staleness: is this task acting on a stale page?
            const touchesStalePage = context.derived.staleTasks.some(p => p.id === task.payload?.pageId);
            breakdown.staleness = touchesStalePage ? weights.stalenessBonus : 0;
            // Sync gap: cross-system sync tasks are high-value
            const isSyncTask = ['sync_status', 'link_notion_to_github', 'create_notion_page'].includes(task.type);
            breakdown.syncGap = isSyncTask ? weights.syncGapBonus : 0;
            // Recency: acting on recently-edited areas
            const touchesRecentPage = context.notion.recentEdits.some(p => p.id === task.payload?.pageId);
            breakdown.recency = touchesRecentPage ? weights.recencyBonus : 0;
            // Overdue bonus
            const touchesOverduePage = context.derived.overdueTasks.some(p => p.id === task.payload?.pageId);
            breakdown.overdue = touchesOverduePage ? weights.overdueBonus : 0;
            // Blocked items — acting on blocked tasks carries slight risk of cascades
            const touchesBlockedPage = context.derived.blockedItems.some(p => p.id === task.payload?.pageId);
            breakdown.blocked = touchesBlockedPage ? weights.blockedPenalty : 0;
            const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
            return { ...task, score, scoreBreakdown: breakdown };
        });
        // Sort descending by score
        return scored
            .sort((a, b) => b.score - a.score)
            .map(({ score: _s, scoreBreakdown: _sb, ...task }) => task);
    }
}
exports.PrioritizerAgent = PrioritizerAgent;
//# sourceMappingURL=prioritizer.js.map