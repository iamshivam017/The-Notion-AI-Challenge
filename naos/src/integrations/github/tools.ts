import {
  githubCreateIssue,
  githubCloseIssue,
  githubClosePR,
  githubAddLabel,
} from './client';

export async function createGitHubIssueFromNotionTask(params: {
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
}): Promise<{ number: number; url: string }> {
  const issue = await githubCreateIssue(params);
  return { number: issue.number, url: issue.html_url };
}

export async function closeGitHubIssue(issueNumber: number): Promise<void> {
  await githubCloseIssue(issueNumber);
}

export async function closeGitHubPR(prNumber: number): Promise<void> {
  await githubClosePR(prNumber);
}

export async function labelGitHubIssue(issueNumber: number, labels: string[]): Promise<void> {
  await githubAddLabel(issueNumber, labels);
}
