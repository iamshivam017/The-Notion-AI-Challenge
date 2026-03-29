"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notionQueryDatabase = notionQueryDatabase;
exports.notionGetDatabase = notionGetDatabase;
exports.notionCreatePage = notionCreatePage;
exports.notionUpdatePage = notionUpdatePage;
exports.notionArchivePage = notionArchivePage;
const client_1 = require("@notionhq/client");
const config_1 = require("../../config");
const rate_limiter_1 = require("../../safety/rate_limiter");
const dry_run_1 = require("../../safety/dry_run");
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_000;
// ---------------------------------------------------------------------------
// Retry wrapper — only retries 429 and 5xx; bails on 4xx client errors
// ---------------------------------------------------------------------------
async function withRetry(fn, op) {
    let lastError;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            await rate_limiter_1.notionLimiter.acquire('notion');
            return await fn();
        }
        catch (err) {
            lastError = err;
            if (err instanceof client_1.APIResponseError) {
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
let _client = null;
function client() {
    if (!_client) {
        _client = new client_1.Client({
            auth: (0, config_1.getConfig)().NOTION_API_KEY,
            timeoutMs: (0, config_1.getConfig)().API_TIMEOUT_MS,
        });
    }
    return _client;
}
// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------
async function notionQueryDatabase(databaseId, filter, sorts) {
    const pages = [];
    let cursor;
    do {
        const result = await withRetry(() => client().databases.query({
            database_id: databaseId,
            filter,
            sorts,
            start_cursor: cursor,
            page_size: 100,
        }), 'databases.query');
        pages.push(...result.results);
        cursor = result.has_more ? (result.next_cursor ?? undefined) : undefined;
    } while (cursor);
    return pages;
}
// ---------------------------------------------------------------------------
// Get database metadata
// ---------------------------------------------------------------------------
async function notionGetDatabase(databaseId) {
    return withRetry(() => client().databases.retrieve({ database_id: databaseId }), 'databases.retrieve');
}
// ---------------------------------------------------------------------------
// Create page
// ---------------------------------------------------------------------------
async function notionCreatePage(databaseId, properties, children) {
    return (0, dry_run_1.dryRunGuard)(`create_notion_page in db:${databaseId}`, { databaseId, properties }, () => withRetry(() => client().pages.create({
        parent: { database_id: databaseId },
        properties: properties,
        children: children,
    }), 'pages.create'), { id: `dry-run-${Date.now()}`, object: 'page' });
}
// ---------------------------------------------------------------------------
// Update page properties
// ---------------------------------------------------------------------------
async function notionUpdatePage(pageId, properties) {
    return (0, dry_run_1.dryRunGuard)(`update_notion_page ${pageId}`, { pageId, properties }, () => withRetry(() => client().pages.update({
        page_id: pageId,
        properties: properties,
    }), 'pages.update'), { id: pageId, object: 'page' });
}
// ---------------------------------------------------------------------------
// Archive page (soft delete — Notion's equivalent)
// ---------------------------------------------------------------------------
async function notionArchivePage(pageId) {
    return (0, dry_run_1.dryRunGuard)(`archive_notion_page ${pageId}`, { pageId }, () => withRetry(() => client().pages.update({ page_id: pageId, archived: true }), 'pages.archive'), { id: pageId, object: 'page' });
}
//# sourceMappingURL=client.js.map