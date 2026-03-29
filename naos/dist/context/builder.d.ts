import type { NotionPage } from '../integrations/notion/sync';
import type { GitHubData, GitHubIssue } from '../integrations/github/sync';
export interface DerivedMetrics {
    staleTasks: NotionPage[];
    unlinkedIssues: GitHubIssue[];
    blockedItems: NotionPage[];
    overdueTasks: NotionPage[];
    velocity: number;
    healthScore: number;
    syncGapCount: number;
}
export interface UnifiedContext {
    snapshotAt: string;
    notion: {
        pages: NotionPage[];
        databaseIds: string[];
        recentEdits: NotionPage[];
    };
    github: GitHubData;
    derived: DerivedMetrics;
}
export declare function buildContext(notionPages: NotionPage[], githubData: GitHubData, forceRefresh?: boolean): Promise<UnifiedContext>;
/** Force-invalidate the context cache (e.g. after a write action). */
export declare function invalidateContextCache(): void;
//# sourceMappingURL=builder.d.ts.map