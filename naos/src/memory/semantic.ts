import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface SemanticMemory {
  key: string;
  value: unknown;
  updatedAt: string;
  accessCount: number;
}

const MEMORY_PATH = join(process.cwd(), 'naos-memory.json');

function load(): Map<string, SemanticMemory> {
  if (!existsSync(MEMORY_PATH)) return new Map();
  try {
    const raw: SemanticMemory[] = JSON.parse(readFileSync(MEMORY_PATH, 'utf-8'));
    return new Map(raw.map(m => [m.key, m]));
  } catch {
    return new Map();
  }
}

function save(map: Map<string, SemanticMemory>): void {
  writeFileSync(MEMORY_PATH, JSON.stringify([...map.values()], null, 2));
}

export function semanticSet(key: string, value: unknown): void {
  const map = load();
  const existing = map.get(key);
  map.set(key, {
    key,
    value,
    updatedAt: new Date().toISOString(),
    accessCount: (existing?.accessCount ?? 0) + 1,
  });
  save(map);
}

export function semanticGet<T = unknown>(key: string): T | undefined {
  const map = load();
  const entry = map.get(key);
  if (!entry) return undefined;
  // Bump access count
  entry.accessCount++;
  map.set(key, entry);
  save(map);
  return entry.value as T;
}

export function semanticGetAll(): SemanticMemory[] {
  return [...load().values()];
}

export function semanticDelete(key: string): void {
  const map = load();
  map.delete(key);
  save(map);
}
