export function approvalResponseStatus(ok: boolean): number {
  return ok ? 200 : 422;
}
