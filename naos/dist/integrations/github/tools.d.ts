export declare function createGitHubIssueFromNotionTask(params: {
    title: string;
    body: string;
    labels?: string[];
    assignees?: string[];
}): Promise<{
    number: number;
    url: string;
}>;
export declare function closeGitHubIssue(issueNumber: number): Promise<void>;
export declare function closeGitHubPR(prNumber: number): Promise<void>;
export declare function labelGitHubIssue(issueNumber: number, labels: string[]): Promise<void>;
//# sourceMappingURL=tools.d.ts.map