/**
 * Episodic memory — stores events from the current run in-process.
 * Cleared between runs. Used so agents can avoid duplicate actions within a run.
 */

export interface EpisodicEvent {
  timestamp: string;
  type: string;
  entityId: string;
  detail: string;
}

const events: EpisodicEvent[] = [];

export function remember(type: string, entityId: string, detail: string): void {
  events.push({ timestamp: new Date().toISOString(), type, entityId, detail });
}

export function recall(type?: string, entityId?: string): EpisodicEvent[] {
  return events.filter(
    e =>
      (!type || e.type === type) &&
      (!entityId || e.entityId === entityId),
  );
}

export function hasActedOn(entityId: string, type?: string): boolean {
  return recall(type, entityId).length > 0;
}

export function clearEpisodicMemory(): void {
  events.length = 0;
}

export function episodicSummary(): string {
  if (events.length === 0) return 'No events this run.';
  return events
    .map(e => `[${e.type}] ${e.entityId}: ${e.detail}`)
    .join('\n');
}
