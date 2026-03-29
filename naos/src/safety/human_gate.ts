import { getConfig } from '../config';
import type { AgentTask } from '../agents/orchestrator';

export type ApprovalStatus = 'approved' | 'rejected' | 'timeout';

interface PendingApproval {
  taskId: string;
  resolve: (status: ApprovalStatus) => void;
  timer: ReturnType<typeof setTimeout>;
}

const pending = new Map<string, PendingApproval>();

/**
 * Request human approval for a task.
 *
 * - If REQUIRE_HUMAN_APPROVAL=false → auto-approves.
 * - If HUMAN_APPROVAL_WEBHOOK is set → POSTs to it and waits.
 * - Otherwise → waits for approve(taskId) to be called programmatically
 *   (useful in tests and CLI flows).
 * - Times out after `timeoutMs` → rejected.
 */
export async function requestApproval(
  task: AgentTask,
  timeoutMs = 120_000,
): Promise<ApprovalStatus> {
  const cfg = getConfig();
  if (!cfg.REQUIRE_HUMAN_APPROVAL) return 'approved';

  console.log(`\n⏸  Human approval required for: "${task.title}"`);
  console.log(`   Type: ${task.type} | Priority: ${task.priority} | Impact: ${task.estimatedImpact}/100`);
  console.log(`   Rationale: ${task.rationale}`);
  console.log(`   Call approve('${task.id}') or reject('${task.id}') within ${timeoutMs / 1000}s\n`);

  if (cfg.HUMAN_APPROVAL_WEBHOOK) {
    await notifyWebhook(cfg.HUMAN_APPROVAL_WEBHOOK, task);
  }

  return new Promise<ApprovalStatus>(resolve => {
    const timer = setTimeout(() => {
      pending.delete(task.id);
      console.warn(`[HumanGate] Timeout for "${task.title}" — rejecting`);
      resolve('timeout');
    }, timeoutMs);

    pending.set(task.id, { taskId: task.id, resolve, timer });
  });
}

/** Programmatically approve a pending task (e.g. from a webhook handler). */
export function approve(taskId: string): boolean {
  const entry = pending.get(taskId);
  if (!entry) return false;
  clearTimeout(entry.timer);
  pending.delete(taskId);
  entry.resolve('approved');
  return true;
}

/** Programmatically reject a pending task. */
export function reject(taskId: string): boolean {
  const entry = pending.get(taskId);
  if (!entry) return false;
  clearTimeout(entry.timer);
  pending.delete(taskId);
  entry.resolve('rejected');
  return true;
}

async function notifyWebhook(url: string, task: AgentTask): Promise<void> {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'naos.approval_required', task }),
    });
  } catch (err) {
    console.warn('[HumanGate] Webhook notification failed:', err);
  }
}
