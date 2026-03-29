import { Client, APIResponseError } from '@notionhq/client';
import type {
  DatabaseObjectResponse,
  PageObjectResponse,
  QueryDatabaseParameters,
} from '@notionhq/client/build/src/api-endpoints';
import { getConfig } from '../../config';
import { notionLimiter } from '../../safety/rate_limiter';
import { dryRunGuard } from '../../safety/dry_run';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_000;

// ---------------------------------------------------------------------------
// Retry wrapper — only retries 429 and 5xx; bails on 4xx client errors
// ---------------------------------------------------------------------------
async function withRetry<T>(fn: () => Promise<T>, op: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await notionLimiter.acquire('notion');
      return await fn();
    } catch (err) {
      lastError = err;
      if (err instanceof APIResponseError) {
        const status = err.status;
        if (status === 429 || status >= 500) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
          console.warn(`[Notion] ${op} failed (${status}), retrying in ${delay.toFixed(0)}ms`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }
      throw err; // Non-retryable error
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Singleton client
// ---------------------------------------------------------------------------
let _client: Client | null = null;
function client(): Client {
  if (!_client) {
    _client = new Client({
      auth: getConfig().NOTION_API_KEY,
      timeoutMs: getConfig().API_TIMEOUT_MS,
    });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------
export async function notionQueryDatabase(
  databaseId: string,
  filter?: QueryDatabaseParameters['filter'],
  sorts?: QueryDatabaseParameters['sorts'],
): Promise<PageObjectResponse[]> {
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const result = await withRetry(
      () => client().databases.query({
        database_id: databaseId,
        filter,
        sorts,
        start_cursor: cursor,
        page_size: 100,
      }),
      'databases.query',
    );
    pages.push(...(result.results as PageObjectResponse[]));
    cursor = result.has_more ? (result.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return pages;
}

// ---------------------------------------------------------------------------
// Get database metadata
// ---------------------------------------------------------------------------
export async function notionGetDatabase(databaseId: string): Promise<DatabaseObjectResponse> {
  return withRetry(
    () => client().databases.retrieve({ database_id: databaseId }) as Promise<DatabaseObjectResponse>,
    'databases.retrieve',
  );
}

// ---------------------------------------------------------------------------
// Create page
// ---------------------------------------------------------------------------
export async function notionCreatePage(
  databaseId: string,
  properties: Record<string, unknown>,
  children?: object[],
): Promise<PageObjectResponse> {
  return dryRunGuard(
    `create_notion_page in db:${databaseId}`,
    { databaseId, properties },
    () => withRetry(
      () => client().pages.create({
        parent: { database_id: databaseId },
        properties: properties as any,
        children: children as any,
      }) as Promise<PageObjectResponse>,
      'pages.create',
    ),
    { id: `dry-run-${Date.now()}`, object: 'page' } as PageObjectResponse,
  );
}

// ---------------------------------------------------------------------------
// Update page properties
// ---------------------------------------------------------------------------
export async function notionUpdatePage(
  pageId: string,
  properties: Record<string, unknown>,
): Promise<PageObjectResponse> {
  return dryRunGuard(
    `update_notion_page ${pageId}`,
    { pageId, properties },
    () => withRetry(
      () => client().pages.update({
        page_id: pageId,
        properties: properties as any,
      }) as Promise<PageObjectResponse>,
      'pages.update',
    ),
    { id: pageId, object: 'page' } as PageObjectResponse,
  );
}

// ---------------------------------------------------------------------------
// Archive page (soft delete — Notion's equivalent)
// ---------------------------------------------------------------------------
export async function notionArchivePage(pageId: string): Promise<PageObjectResponse> {
  return dryRunGuard(
    `archive_notion_page ${pageId}`,
    { pageId },
    () => withRetry(
      () => client().pages.update({ page_id: pageId, archived: true }) as Promise<PageObjectResponse>,
      'pages.archive',
    ),
    { id: pageId, object: 'page' } as PageObjectResponse,
  );
}
