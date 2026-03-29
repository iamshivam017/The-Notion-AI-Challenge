import type { UnifiedContext } from '../context/builder';
export type TaskType = 'create_notion_page' | 'update_notion_status' | 'link_notion_to_github' | 'archive_notion_page' | 'create_github_issue' | 'close_github_issue' | 'close_github_pr' | 'add_github_label' | 'sync_status';
export interface AgentTask {
    id: string;
    type: TaskType;
    priority: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    rationale: string;
    payload: Record<string, unknown>;
    estimatedImpact: number;
    requiresApproval: boolean;
}
export interface RunResult {
    runId: string;
    startedAt: string;
    completedAt: string;
    tasksGenerated: number;
    tasksPassed: number;
    tasksExecuted: number;
    tasksFailed: number;
    improvements: string[];
    healthScoreBefore: number;
    healthScoreAfter?: number;
    dryRun: boolean;
}
export declare class OrchestratorAgent {
    private readonly taskGen;
    private readonly prioritizer;
    private readonly executor;
    private readonly reviewer;
    private readonly selfImprover;
    run(context: UnifiedContext): Promise<RunResult>;
}
//# sourceMappingURL=orchestrator.d.ts.map