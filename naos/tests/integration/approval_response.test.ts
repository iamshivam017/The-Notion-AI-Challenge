import { expect, test } from '@jest/globals';
import { approvalResponseStatus } from '../../src/http/approval_response';

test('returns 200 when approval action succeeds', () => {
  expect(approvalResponseStatus(true)).toBe(200);
});

test('returns 422 when approval action fails due to unknown task', () => {
  expect(approvalResponseStatus(false)).toBe(422);
});
