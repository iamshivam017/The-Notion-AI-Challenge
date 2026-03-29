import type { AgentTask } from '../agents/orchestrator';
export type ApprovalStatus = 'approved' | 'rejected' | 'timeout';
/**
 * Request human approval for a task.
 *
 * - If REQUIRE_HUMAN_APPROVAL=false → auto-approves.
 * - If HUMAN_APPROVAL_WEBHOOK is set → POSTs to it and waits.
 * - Otherwise → waits for approve(taskId) to be called programmatically
 *   (useful in tests and CLI flows).
 * - Times out after `timeoutMs` → rejected.
 */
export declare function requestApproval(task: AgentTask, timeoutMs?: number): Promise<ApprovalStatus>;
/** Programmatically approve a pending task (e.g. from a webhook handler). */
export declare function approve(taskId: string): boolean;
/** Programmatically reject a pending task. */
export declare function reject(taskId: string): boolean;
//# sourceMappingURL=human_gate.d.ts.map