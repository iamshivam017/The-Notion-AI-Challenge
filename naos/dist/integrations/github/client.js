"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.githubListIssues = githubListIssues;
exports.githubCreateIssue = githubCreateIssue;
exports.githubCloseIssue = githubCloseIssue;
exports.githubAddLabel = githubAddLabel;
exports.githubListPRs = githubListPRs;
exports.githubClosePR = githubClosePR;
exports.githubListRecentCommits = githubListRecentCommits;
const rest_1 = require("@octokit/rest");
const config_1 = require("../../config");
const rate_limiter_1 = require("../../safety/rate_limiter");
const dry_run_1 = require("../../safety/dry_run");
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_000;
async function withRetry(fn, op) {
    let lastError;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            await rate_limiter_1.githubLimiter.acquire('github');
            return await fn();
        }
        catch (err) {
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
let _octokit = null;
function octokit() {
    if (!_octokit) {
        _octokit = new rest_1.Octokit({
            auth: (0, config_1.getConfig)().GITHUB_TOKEN,
            request: { timeout: (0, config_1.getConfig)().API_TIMEOUT_MS },
        });
    }
    return _octokit;
}
function ownerRepo() {
    const cfg = (0, config_1.getConfig)();
    return { owner: cfg.GITHUB_OWNER, repo: cfg.GITHUB_REPO };
}
// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------
async function githubListIssues(state = 'open') {
    const issues = [];
    let page = 1;
    while (true) {
        const res = await withRetry(() => octokit().rest.issues.listForRepo({ ...ownerRepo(), state, per_page: 100, page }), 'issues.list');
        issues.push(...res.data.filter(i => !i.pull_request));
        if (res.data.length < 100)
            break;
        page++;
    }
    return issues;
}
async function githubCreateIssue(params) {
    return (0, dry_run_1.dryRunGuard)(`create_github_issue: ${params.title}`, params, () => withRetry(() => octokit().rest.issues.create({ ...ownerRepo(), ...params }), 'issues.create').then(r => r.data), { number: 0, html_url: 'dry-run', id: 0 });
}
async function githubCloseIssue(issueNumber) {
    return (0, dry_run_1.dryRunGuard)(`close_github_issue #${issueNumber}`, { issueNumber }, () => withRetry(() => octokit().rest.issues.update({ ...ownerRepo(), issue_number: issueNumber, state: 'closed' }), 'issues.close').then(r => r.data), { number: issueNumber });
}
async function githubAddLabel(issueNumber, labels) {
    return (0, dry_run_1.dryRunGuard)(`add_labels #${issueNumber}: ${labels.join(', ')}`, { issueNumber, labels }, () => withRetry(() => octokit().rest.issues.addLabels({ ...ownerRepo(), issue_number: issueNumber, labels }), 'issues.addLabels').then(r => r.data), []);
}
// ---------------------------------------------------------------------------
// Pull Requests
// ---------------------------------------------------------------------------
async function githubListPRs(state = 'open') {
    const res = await withRetry(() => octokit().rest.pulls.list({ ...ownerRepo(), state, per_page: 100 }), 'pulls.list');
    return res.data;
}
async function githubClosePR(prNumber) {
    return (0, dry_run_1.dryRunGuard)(`close_github_pr #${prNumber}`, { prNumber }, () => withRetry(() => octokit().rest.pulls.update({ ...ownerRepo(), pull_number: prNumber, state: 'closed' }), 'pulls.close').then(r => r.data), { number: prNumber });
}
// ---------------------------------------------------------------------------
// Commits
// ---------------------------------------------------------------------------
async function githubListRecentCommits(since) {
    const res = await withRetry(() => octokit().rest.repos.listCommits({ ...ownerRepo(), since, per_page: 50 }), 'repos.listCommits');
    return res.data;
}
//# sourceMappingURL=client.js.map