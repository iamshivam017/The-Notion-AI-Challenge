/**
 * Wraps a function so it only executes when DRY_RUN=false.
 * In dry-run mode, logs the intended action and returns a mock result.
 */
export declare function dryRunGuard<T>(label: string, payload: unknown, realAction: () => Promise<T>, mockResult: T): Promise<T>;
//# sourceMappingURL=dry_run.d.ts.map