export interface CreateTaskParams {
    databaseId: string;
    title: string;
    status?: string;
    priority?: string;
    assignee?: string;
    dueDate?: string;
    githubIssueUrl?: string;
    description?: string;
}
export declare function createNotionTask(params: CreateTaskParams): Promise<{
    id: string;
}>;
export declare function updateNotionTaskStatus(pageId: string, status: string): Promise<void>;
export declare function linkNotionTaskToGitHub(pageId: string, githubUrl: string): Promise<void>;
export declare function archiveStaleNotionTask(pageId: string): Promise<void>;
//# sourceMappingURL=tools.d.ts.map