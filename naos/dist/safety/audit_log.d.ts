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
declare class AuditLog {
    private readonly logPath;
    private lastHash;
    constructor(logPath?: string);
    /** Recover the last hash from an existing log file (restart-safe). */
    private recoverLastHash;
    record(input: RecordInput): AuditEntry;
    /** Verify the hash chain is intact. Returns { valid, brokenAt }. */
    verify(): {
        valid: boolean;
        brokenAt?: number;
    };
}
export declare const auditLog: AuditLog;
export {};
//# sourceMappingURL=audit_log.d.ts.map