"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dryRunGuard = dryRunGuard;
const config_1 = require("../config");
/**
 * Wraps a function so it only executes when DRY_RUN=false.
 * In dry-run mode, logs the intended action and returns a mock result.
 */
function dryRunGuard(label, payload, realAction, mockResult) {
    const cfg = (0, config_1.getConfig)();
    if (cfg.DRY_RUN) {
        console.log(`[DRY RUN] Would execute: ${label}`);
        console.log('[DRY RUN] Payload:', JSON.stringify(payload, null, 2));
        return Promise.resolve(mockResult);
    }
    return realAction();
}
//# sourceMappingURL=dry_run.js.map