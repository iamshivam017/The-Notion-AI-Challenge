import type { AgentTask } from '../agents/orchestrator';

const PRIORITY_WEIGHTS: Record<AgentTask['priority'], number> = {
  critical: 1000,
  high: 100,
  medium: 10,
  low: 1,
};

interface QueueItem {
  task: AgentTask;
  weight: number;
  enqueuedAt: number;
}

const queue: QueueItem[] = [];

export function enqueueTask(task: AgentTask): void {
  const weight = PRIORITY_WEIGHTS[task.priority] + task.estimatedImpact;
  queue.push({ task, weight, enqueuedAt: Date.now() });
  // Keep sorted descending by weight, then by enqueue time ascending (FIFO within same weight)
  queue.sort((a, b) =>
    b.weight !== a.weight ? b.weight - a.weight : a.enqueuedAt - b.enqueuedAt,
  );
}

export function dequeueTask(): AgentTask | null {
  const item = queue.shift();
  return item?.task ?? null;
}

export function peekQueue(): AgentTask[] {
  return queue.map(i => i.task);
}

export function clearTaskQueue(): void {
  queue.length = 0;
}

export function taskQueueLength(): number {
  return queue.length;
}
