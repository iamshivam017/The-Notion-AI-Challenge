import type { AgentTask } from './orchestrator';
import type { UnifiedContext } from '../context/builder';
export declare class ReviewerAgent {
    assess(task: AgentTask, context: UnifiedContext): Promise<{
        approved: boolean;
        task: AgentTask;
    }>;
}
//# sourceMappingURL=reviewer.d.ts.map