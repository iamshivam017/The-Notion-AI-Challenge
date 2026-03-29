import { notionQueryDatabase, notionGetDatabase } from './client';
import { getConfig } from '../../config';

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

// ---------------------------------------------------------------------------
// Extract a readable title from Notion page properties
// ---------------------------------------------------------------------------
function extractTitle(properties: Record<string, any>): string {
  for (const key of ['Name', 'Title', 'Task', 'Page']) {
    const prop = properties[key];
    if (prop?.title?.[0]?.plain_text) return prop.title[0].plain_text;
  }
  return 'Untitled';
}

function extractStatus(properties: Record<string, any>): string | undefined {
  return properties?.Status?.select?.name
    ?? properties?.State?.select?.name
    ?? properties?.['Status']?.status?.name
    ?? undefined;
}

function extractPriority(properties: Record<string, any>): string | undefined {
  return properties?.Priority?.select?.name ?? undefined;
}

function extractAssignee(properties: Record<string, any>): string | undefined {
  return properties?.Assignee?.people?.[0]?.name
    ?? properties?.Owner?.people?.[0]?.name
    ?? undefined;
}

function extractDueDate(properties: Record<string, any>): string | undefined {
  return properties?.['Due Date']?.date?.start
    ?? properties?.Due?.date?.start
    ?? undefined;
}

function extractGitHubUrl(properties: Record<string, any>): string | undefined {
  return properties?.['GitHub Issue']?.url
    ?? properties?.['GitHub PR']?.url
    ?? properties?.GitHubIssue?.url
    ?? undefined;
}

// ---------------------------------------------------------------------------
// Fetch all pages across all configured databases
// ---------------------------------------------------------------------------
export async function syncNotionWorkspace(): Promise<NotionPage[]> {
  const cfg = getConfig();
  const allPages: NotionPage[] = [];

  for (const dbId of cfg.NOTION_DATABASE_IDS) {
    try {
      const rawPages = await notionQueryDatabase(dbId);
      for (const raw of rawPages) {
        const props = raw.properties as Record<string, any>;
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
    } catch (err) {
      console.error(`[NotionSync] Failed to fetch db:${dbId}:`, err);
    }
  }

  return allPages;
}
