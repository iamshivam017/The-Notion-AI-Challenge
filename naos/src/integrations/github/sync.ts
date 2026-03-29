import { githubListIssues, githubListPRs, githubListRecentCommits } from './client';

export interface GitHubIssue {
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  labels: string[];
  assignee?: string;
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface GitHubPR {
  number: number;
  title: string;
  state: string;
  draft: boolean;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
  url: string;
  headRef: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  timestamp: string;
  url: string;
}

export interface GitHubData {
  issues: GitHubIssue[];
  prs: GitHubPR[];
  commits: GitHubCommit[];
}

export async function syncGitHub(): Promise<GitHubData> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [rawIssues, rawPRs, rawCommits] = await Promise.all([
    githubListIssues('open'),
    githubListPRs('open'),
    githubListRecentCommits(sevenDaysAgo),
  ]);

  const issues: GitHubIssue[] = rawIssues.map(i => ({
    number: i.number,
    title: i.title,
    body: i.body ?? undefined,
    state: i.state as 'open' | 'closed',
    labels: (i.labels ?? []).map(l => (typeof l === 'string' ? l : l.name ?? '')),
    assignee: i.assignee?.login,
    createdAt: i.created_at,
    updatedAt: i.updated_at,
    url: i.html_url,
  }));

  const prs: GitHubPR[] = rawPRs.map(p => ({
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

  const commits: GitHubCommit[] = rawCommits.map(c => ({
    sha: c.sha.slice(0, 7),
    message: c.commit.message.split('\n')[0],
    author: c.commit.author?.name ?? 'unknown',
    timestamp: c.commit.author?.date ?? '',
    url: c.html_url,
  }));

  console.log(`[GitHubSync] ${issues.length} issues, ${prs.length} PRs, ${commits.length} commits`);
  return { issues, prs, commits };
}
