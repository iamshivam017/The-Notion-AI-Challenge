import { notionCreatePage, notionUpdatePage, notionArchivePage } from './client';

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

export async function createNotionTask(params: CreateTaskParams): Promise<{ id: string }> {
  const properties: Record<string, unknown> = {
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

  const page = await notionCreatePage(params.databaseId, properties, children);
  return { id: page.id };
}

export async function updateNotionTaskStatus(pageId: string, status: string): Promise<void> {
  await notionUpdatePage(pageId, {
    Status: { select: { name: status } },
  });
}

export async function linkNotionTaskToGitHub(pageId: string, githubUrl: string): Promise<void> {
  await notionUpdatePage(pageId, {
    'GitHub Issue': { url: githubUrl },
  });
}

export async function archiveStaleNotionTask(pageId: string): Promise<void> {
  await notionArchivePage(pageId);
}
