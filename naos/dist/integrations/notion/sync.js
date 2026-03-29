"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncNotionWorkspace = syncNotionWorkspace;
const client_1 = require("./client");
const config_1 = require("../../config");
// ---------------------------------------------------------------------------
// Extract a readable title from Notion page properties
// ---------------------------------------------------------------------------
function extractTitle(properties) {
    for (const key of ['Name', 'Title', 'Task', 'Page']) {
        const prop = properties[key];
        if (prop?.title?.[0]?.plain_text)
            return prop.title[0].plain_text;
    }
    return 'Untitled';
}
function extractStatus(properties) {
    return properties?.Status?.select?.name
        ?? properties?.State?.select?.name
        ?? properties?.['Status']?.status?.name
        ?? undefined;
}
function extractPriority(properties) {
    return properties?.Priority?.select?.name ?? undefined;
}
function extractAssignee(properties) {
    return properties?.Assignee?.people?.[0]?.name
        ?? properties?.Owner?.people?.[0]?.name
        ?? undefined;
}
function extractDueDate(properties) {
    return properties?.['Due Date']?.date?.start
        ?? properties?.Due?.date?.start
        ?? undefined;
}
function extractGitHubUrl(properties) {
    return properties?.['GitHub Issue']?.url
        ?? properties?.['GitHub PR']?.url
        ?? properties?.GitHubIssue?.url
        ?? undefined;
}
// ---------------------------------------------------------------------------
// Fetch all pages across all configured databases
// ---------------------------------------------------------------------------
async function syncNotionWorkspace() {
    const cfg = (0, config_1.getConfig)();
    const allPages = [];
    for (const dbId of cfg.NOTION_DATABASE_IDS) {
        try {
            const rawPages = await (0, client_1.notionQueryDatabase)(dbId);
            for (const raw of rawPages) {
                const props = raw.properties;
                allPages.push({
                    id: raw.id,
                    title: extractTitle(props),
                    status: extractStatus(props),
                    priority: extractPriority(props),
                    assignee: extractAssignee(props),
                    dueDate: extractDueDate(props),
                    githubIssueUrl: extractGitHubUrl(props),
                    lastEdited: raw.last_edited_time,
                    created: raw.created_time,
                    databaseId: dbId,
                    url: raw.url,
                    properties: props,
                });
            }
            console.log(`[NotionSync] Fetched ${rawPages.length} pages from db:${dbId}`);
        }
        catch (err) {
            console.error(`[NotionSync] Failed to fetch db:${dbId}:`, err);
        }
    }
    return allPages;
}
//# sourceMappingURL=sync.js.map