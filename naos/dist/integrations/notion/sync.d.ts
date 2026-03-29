export interface NotionPage {
    id: string;
    title: string;
    status?: string;
    priority?: string;
    assignee?: string;
    dueDate?: string;
    githubIssueUrl?: string;
    lastEdited: string;
    created: string;
    databaseId: string;
    url: string;
    properties: Record<string, unknown>;
}
export declare function syncNotionWorkspace(): Promise<NotionPage[]>;
//# sourceMappingURL=sync.d.ts.map