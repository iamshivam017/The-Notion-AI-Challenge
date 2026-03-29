import { Octokit } from '@octokit/rest';
import { getConfig } from '../../config';
import { githubLimiter } from '../../safety/rate_limiter';
import { dryRunGuard } from '../../safety/dry_run';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_000;

async function withRetry<T>(fn: () => Promise<T>, op: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await githubLimiter.acquire('github');
      return await fn();
    } catch (err: any) {
      lastError = err;
      const status = err?.status ?? err?.response?.status;
      if (status === 429 || status === 403 || status >= 500) {
        const retryAfter = parseInt(err?.response?.headers?.['retry-after'] ?? '0', 10);
        const delay = retryAfter > 0
          ? retryAfter * 1000
          : BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(`[GitHub] ${op} failed (${status}), retrying in ${delay.toFixed(0)}ms`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

let _octokit: Octokit | null = null;
function octokit(): Octokit {
  if (!_octokit) {
    _octokit = new Octokit({
      auth: getConfig().GITHUB_TOKEN,
      request: { timeout: getConfig().API_TIMEOUT_MS },
    });
  }
  return _octokit;
}

function ownerRepo() {
  const cfg = getConfig();
  return { owner: cfg.GITHUB_OWNER, repo: cfg.GITHUB_REPO };
}

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------
export async function githubListIssues(state: 'open' | 'closed' | 'all' = 'open') {
  const issues: Awaited<ReturnType<typeof octokit>['rest']['issues']['list']>['data'] = [];
  let page = 1;
  while (true) {
    const res = await withRetry(
      () => octokit().rest.issues.listForRepo({ ...ownerRepo(), state, per_page: 100, page }),
      'issues.list',
    );
    issues.push(...res.data.filter(i => !i.pull_request));
    if (res.data.length < 100) break;
    page++;
  }
  return issues;
}

export async function githubCreateIssue(params: {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
}) {
  return dryRunGuard(
    `create_github_issue: ${params.title}`,
    params,
    () => withRetry(
      () => octokit().rest.issues.create({ ...ownerRepo(), ...params }),
      'issues.create',
    ).then(r => r.data),
    { number: 0, html_url: 'dry-run', id: 0 } as any,
  );
}

export async function githubCloseIssue(issueNumber: number) {
  return dryRunGuard(
    `close_github_issue #${issueNumber}`,
    { issueNumber },
    () => withRetry(
      () => octokit().rest.issues.update({ ...ownerRepo(), issue_number: issueNumber, state: 'closed' }),
      'issues.close',
    ).then(r => r.data),
    { number: issueNumber } as any,
  );
}

export async function githubAddLabel(issueNumber: number, labels: string[]) {
  return dryRunGuard(
    `add_labels #${issueNumber}: ${labels.join(', ')}`,
    { issueNumber, labels },
    () => withRetry(
      () => octokit().rest.issues.addLabels({ ...ownerRepo(), issue_number: issueNumber, labels }),
      'issues.addLabels',
    ).then(r => r.data),
    [] as any,
  );
}

// ---------------------------------------------------------------------------
// Pull Requests
// ---------------------------------------------------------------------------
export async function githubListPRs(state: 'open' | 'closed' | 'all' = 'open') {
  const res = await withRetry(
    () => octokit().rest.pulls.list({ ...ownerRepo(), state, per_page: 100 }),
    'pulls.list',
  );
  return res.data;
}

export async function githubClosePR(prNumber: number) {
  return dryRunGuard(
    `close_github_pr #${prNumber}`,
    { prNumber },
    () => withRetry(
      () => octokit().rest.pulls.update({ ...ownerRepo(), pull_number: prNumber, state: 'closed' }),
      'pulls.close',
    ).then(r => r.data),
    { number: prNumber } as any,
  );
}

// ---------------------------------------------------------------------------
// Commits
// ---------------------------------------------------------------------------
export async function githubListRecentCommits(since?: string) {
  const res = await withRetry(
    () => octokit().rest.repos.listCommits({ ...ownerRepo(), since, per_page: 50 }),
    'repos.listCommits',
  );
  return res.data;
}
