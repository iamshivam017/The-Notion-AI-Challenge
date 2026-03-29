"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotionTask = createNotionTask;
exports.updateNotionTaskStatus = updateNotionTaskStatus;
exports.linkNotionTaskToGitHub = linkNotionTaskToGitHub;
exports.archiveStaleNotionTask = archiveStaleNotionTask;
const client_1 = require("./client");
async function createNotionTask(params) {
    const properties = {
        Name: { title: [{ text: { content: params.title } }] },
    };
    if (params.status) {
        properties['Status'] = { select: { name: params.status } };
    }
    if (params.priority) {
        properties['Priority'] = { select: { name: params.priority } };
    }
    if (params.dueDate) {
        properties['Due Date'] = { date: { start: params.dueDate } };
    }
    if (params.githubIssueUrl) {
        properties['GitHub Issue'] = { url: params.githubIssueUrl };
    }
    const children = params.description
        ? [{
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    rich_text: [{ type: 'text', text: { content: params.description } }],
                },
            }]
        : undefined;
    const page = await (0, client_1.notionCreatePage)(params.databaseId, properties, children);
    return { id: page.id };
}
async function updateNotionTaskStatus(pageId, status) {
    await (0, client_1.notionUpdatePage)(pageId, {
        Status: { select: { name: status } },
    });
}
async function linkNotionTaskToGitHub(pageId, githubUrl) {
    await (0, client_1.notionUpdatePage)(pageId, {
        'GitHub Issue': { url: githubUrl },
    });
}
async function archiveStaleNotionTask(pageId) {
    await (0, client_1.notionArchivePage)(pageId);
}
//# sourceMappingURL=tools.js.map