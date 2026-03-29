import type { AgentTask } from './orchestrator';
import type { UnifiedContext } from '../context/builder';
export declare class PrioritizerAgent {
    private getWeights;
    rank(tasks: AgentTask[], context: UnifiedContext): Promise<AgentTask[]>;
}
//# sourceMappingURL=prioritizer.d.ts.map