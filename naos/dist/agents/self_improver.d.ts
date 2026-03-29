import type { AgentTask } from './orchestrator';
import type { UnifiedContext } from '../context/builder';
export declare class SelfImproverAgent {
    analyze(tasks: AgentTask[], results: PromiseSettledResult<void>[], context: UnifiedContext): Promise<string[]>;
}
//# sourceMappingURL=self_improver.d.ts.map