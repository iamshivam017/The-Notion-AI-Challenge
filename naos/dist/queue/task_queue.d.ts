import type { AgentTask } from '../agents/orchestrator';
export declare function enqueueTask(task: AgentTask): void;
export declare function dequeueTask(): AgentTask | null;
export declare function peekQueue(): AgentTask[];
export declare function clearTaskQueue(): void;
export declare function taskQueueLength(): number;
//# sourceMappingURL=task_queue.d.ts.map