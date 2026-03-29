import { getConfig } from '../config';

/**
 * Wraps a function so it only executes when DRY_RUN=false.
 * In dry-run mode, logs the intended action and returns a mock result.
 */
export function dryRunGuard<T>(
  label: string,
  payload: unknown,
  realAction: () => Promise<T>,
  mockResult: T,
): Promise<T> {
  const cfg = getConfig();
  if (cfg.DRY_RUN) {
    console.log(`[DRY RUN] Would execute: ${label}`);
    console.log('[DRY RUN] Payload:', JSON.stringify(payload, null, 2));
    return Promise.resolve(mockResult);
  }
  return realAction();
}
