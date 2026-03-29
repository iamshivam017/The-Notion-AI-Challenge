"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncGitHub = syncGitHub;
const client_1 = require("./client");
async function syncGitHub() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [rawIssues, rawPRs, rawCommits] = await Promise.all([
        (0, client_1.githubListIssues)('open'),
        (0, client_1.githubListPRs)('open'),
        (0, client_1.githubListRecentCommits)(sevenDaysAgo),
    ]);
    const issues = rawIssues.map(i => ({
        number: i.number,
        title: i.title,
        body: i.body ?? undefined,
        state: i.state,
        labels: (i.labels ?? []).map(l => (typeof l === 'string' ? l : l.name ?? '')),
        assignee: i.assignee?.login,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
        url: i.html_url,
    }));
    const prs = rawPRs.map(p => ({
        number: p.number,
        title: p.title,
        state: p.state,
        draft: p.draft ?? false,
        reviewCount: 0, // Would require extra API call per PR
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        url: p.html_url,
        headRef: p.head.ref,
    }));
    const commits = rawCommits.map(c => ({
        sha: c.sha.slice(0, 7),
        message: c.commit.message.split('\n')[0],
        author: c.commit.author?.name ?? 'unknown',
        timestamp: c.commit.author?.date ?? '',
        url: c.html_url,
    }));
    console.log(`[GitHubSync] ${issues.length} issues, ${prs.length} PRs, ${commits.length} commits`);
    return { issues, prs, commits };
}
//# sourceMappingURL=sync.js.map