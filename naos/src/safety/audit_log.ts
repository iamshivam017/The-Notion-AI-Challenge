import { createHash } from 'crypto';
import { appendFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type AuditOutcome = 'success' | 'failure' | 'skipped' | 'pending';

export interface AuditEntry {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  payload: unknown;
  dryRun: boolean;
  approved: boolean;
  outcome: AuditOutcome;
  error?: string;
  durationMs?: number;
  prevHash: string;
  hash: string;
}

type RecordInput = Omit<AuditEntry, 'id' | 'timestamp' | 'prevHash' | 'hash'>;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------
class AuditLog {
  private readonly logPath: string;
  private lastHash: string;

  constructor(logPath?: string) {
    this.logPath = logPath ?? join(process.cwd(), 'naos-audit.ndjson');
    this.lastHash = this.recoverLastHash();
  }

  /** Recover the last hash from an existing log file (restart-safe). */
  private recoverLastHash(): string {
    const zero = '0'.repeat(64);
    if (!existsSync(this.logPath)) return zero;
    try {
      const content = readFileSync(this.logPath, 'utf-8').trim();
      if (!content) return zero;
      const lines = content.split('\n');
      const lastLine = lines[lines.length - 1];
      const entry = JSON.parse(lastLine) as AuditEntry;
      return entry.hash ?? zero;
    } catch {
      return zero;
    }
  }

  record(input: RecordInput): AuditEntry {
    const partial = {
      ...input,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      prevHash: this.lastHash,
    };
    const hash = createHash('sha256')
      .update(JSON.stringify(partial))
      .digest('hex');
    const full: AuditEntry = { ...partial, hash };

    appendFileSync(this.logPath, JSON.stringify(full) + '\n', { flag: 'a' });
    this.lastHash = hash;
    return full;
  }

  /** Verify the hash chain is intact. Returns { valid, brokenAt }. */
  verify(): { valid: boolean; brokenAt?: number } {
    if (!existsSync(this.logPath)) return { valid: true };
    const lines = readFileSync(this.logPath, 'utf-8').trim().split('\n').filter(Boolean);
    let prevHash = '0'.repeat(64);
    for (let i = 0; i < lines.length; i++) {
      const entry = JSON.parse(lines[i]) as AuditEntry;
      const { hash, ...rest } = entry;
      const expected = createHash('sha256').update(JSON.stringify(rest)).digest('hex');
      if (expected !== hash || rest.prevHash !== prevHash) {
        return { valid: false, brokenAt: i + 1 };
      }
      prevHash = hash;
    }
    return { valid: true };
  }
}

export const auditLog = new AuditLog();
