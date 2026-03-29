"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = void 0;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------
class AuditLog {
    logPath;
    lastHash;
    constructor(logPath) {
        this.logPath = logPath ?? (0, path_1.join)(process.cwd(), 'naos-audit.ndjson');
        this.lastHash = this.recoverLastHash();
    }
    /** Recover the last hash from an existing log file (restart-safe). */
    recoverLastHash() {
        const zero = '0'.repeat(64);
        if (!(0, fs_1.existsSync)(this.logPath))
            return zero;
        try {
            const content = (0, fs_1.readFileSync)(this.logPath, 'utf-8').trim();
            if (!content)
                return zero;
            const lines = content.split('\n');
            const lastLine = lines[lines.length - 1];
            const entry = JSON.parse(lastLine);
            return entry.hash ?? zero;
        }
        catch {
            return zero;
        }
    }
    record(input) {
        const partial = {
            ...input,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            prevHash: this.lastHash,
        };
        const hash = (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify(partial))
            .digest('hex');
        const full = { ...partial, hash };
        (0, fs_1.appendFileSync)(this.logPath, JSON.stringify(full) + '\n', { flag: 'a' });
        this.lastHash = hash;
        return full;
    }
    /** Verify the hash chain is intact. Returns { valid, brokenAt }. */
    verify() {
        if (!(0, fs_1.existsSync)(this.logPath))
            return { valid: true };
        const lines = (0, fs_1.readFileSync)(this.logPath, 'utf-8').trim().split('\n').filter(Boolean);
        let prevHash = '0'.repeat(64);
        for (let i = 0; i < lines.length; i++) {
            const entry = JSON.parse(lines[i]);
            const { hash, ...rest } = entry;
            const expected = (0, crypto_1.createHash)('sha256').update(JSON.stringify(rest)).digest('hex');
            if (expected !== hash || rest.prevHash !== prevHash) {
                return { valid: false, brokenAt: i + 1 };
            }
            prevHash = hash;
        }
        return { valid: true };
    }
}
exports.auditLog = new AuditLog();
//# sourceMappingURL=audit_log.js.map