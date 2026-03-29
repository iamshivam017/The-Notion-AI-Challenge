import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

const TEST_LOG_PATH = join(__dirname, 'test-audit.ndjson');

// Clean up before/after
beforeEach(() => { if (existsSync(TEST_LOG_PATH)) unlinkSync(TEST_LOG_PATH); });
afterAll(() => { if (existsSync(TEST_LOG_PATH)) unlinkSync(TEST_LOG_PATH); });

// Re-import with a fresh instance for each test
function makeLog() {
  // Bypass module cache for isolated test instances
  jest.resetModules();
  const { AuditLog } = require('../../src/safety/audit_log') as any;
  return new AuditLog(TEST_LOG_PATH);
}

test('records an entry and returns it with a hash', () => {
  const log = makeLog();
  const entry = log.record({
    agent: 'test', action: 'test_action', payload: { foo: 'bar' },
    dryRun: true, approved: true, outcome: 'success',
  });
  expect(entry.hash).toHaveLength(64);
  expect(entry.prevHash).toBe('0'.repeat(64));
  expect(entry.id).toBeTruthy();
});

test('hash chain is valid after multiple entries', () => {
  const log = makeLog();
  log.record({ agent: 'a', action: 'one', payload: {}, dryRun: true, approved: true, outcome: 'success' });
  log.record({ agent: 'b', action: 'two', payload: {}, dryRun: true, approved: true, outcome: 'success' });
  log.record({ agent: 'c', action: 'three', payload: {}, dryRun: false, approved: true, outcome: 'failure' });
  expect(log.verify().valid).toBe(true);
});

test('verify detects tampering', () => {
  const log = makeLog();
  log.record({ agent: 'a', action: 'action', payload: {}, dryRun: true, approved: true, outcome: 'success' });

  // Corrupt the log
  const content = require('fs').readFileSync(TEST_LOG_PATH, 'utf-8');
  const lines = content.trim().split('\n');
  const parsed = JSON.parse(lines[0]);
  parsed.action = 'tampered_action';
  require('fs').writeFileSync(TEST_LOG_PATH, JSON.stringify(parsed) + '\n');

  expect(log.verify().valid).toBe(false);
  expect(log.verify().brokenAt).toBe(1);
});
