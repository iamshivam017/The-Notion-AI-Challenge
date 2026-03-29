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
export declare function syncGitHub(): Promise<GitHubData>;
//# sourceMappingURL=sync.d.ts.map