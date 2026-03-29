import Redis from 'ioredis';
import { getConfig } from '../config';

export interface QueuedEvent {
  id: string;
  source: 'github_webhook' | 'notion_webhook' | 'scheduler' | 'manual';
  type: string;
  payload: unknown;
  enqueuedAt: string;
}

const QUEUE_KEY = 'naos:events';

let _redis: Redis | null = null;

function redis(): Redis {
  if (!_redis) {
    _redis = new Redis(getConfig().REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    _redis.on('error', err => console.error('[Redis] Error:', err));
  }
  return _redis;
}

export async function enqueue(event: Omit<QueuedEvent, 'id' | 'enqueuedAt'>): Promise<void> {
  const full: QueuedEvent = {
    ...event,
    id: crypto.randomUUID(),
    enqueuedAt: new Date().toISOString(),
  };
  await redis().rpush(QUEUE_KEY, JSON.stringify(full));
}

export async function dequeue(): Promise<QueuedEvent | null> {
  const raw = await redis().lpop(QUEUE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as QueuedEvent;
}

export async function queueLength(): Promise<number> {
  return redis().llen(QUEUE_KEY);
}

export async function drainQueue(): Promise<QueuedEvent[]> {
  const events: QueuedEvent[] = [];
  let event: QueuedEvent | null;
  while ((event = await dequeue()) !== null) {
    events.push(event);
  }
  return events;
}

export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
  }
}
