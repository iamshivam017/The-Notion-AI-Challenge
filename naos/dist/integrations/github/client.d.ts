export declare function githubListIssues(state?: 'open' | 'closed' | 'all'): Promise<any>;
export declare function githubCreateIssue(params: {
    title: string;
    body?: string;
    labels?: string[];
    assignees?: string[];
}): Promise<any>;
export declare function githubCloseIssue(issueNumber: number): Promise<any>;
export declare function githubAddLabel(issueNumber: number, labels: string[]): Promise<any>;
export declare function githubListPRs(state?: 'open' | 'closed' | 'all'): Promise<any>;
export declare function githubClosePR(prNumber: number): Promise<any>;
export declare function githubListRecentCommits(since?: string): Promise<any>;
//# sourceMappingURL=client.d.ts.map