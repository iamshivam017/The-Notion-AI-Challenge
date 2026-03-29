"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskGeneratorAgent = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const config_1 = require("../config");
const rate_limiter_1 = require("../safety/rate_limiter");
const semantic_1 = require("../memory/semantic");
const client = new sdk_1.default();
// ---------------------------------------------------------------------------
// System prompt — refined by self-improver over time
// ---------------------------------------------------------------------------
const BASE_SYSTEM_PROMPT = `You are NAOS Task Generator — a specialist agent that converts a unified workspace snapshot into structured, actionable tasks.

RULES:
1. Every task must have a clear, measurable outcome.
2. Do NOT create tasks for items that are Done or Cancelled.
3. Prioritize cross-system sync gaps (Notion ↔ GitHub mismatches).
4. Never generate tasks that delete data — only create, update, link, label, or archive.
5. Avoid duplicates: check the recent actions summary.
6. Limit output to 20 tasks maximum. Quality over quantity.
7. requiresApproval must be true for any write to production systems.
8. Return ONLY valid JSON array matching the schema below. No markdown, no preamble.

TASK SCHEMA (each item):
{
  "id": "uuid-v4",
  "type": "create_notion_page|update_notion_status|link_notion_to_github|archive_notion_page|create_github_issue|close_github_issue|close_github_pr|add_github_label|sync_status",
  "priority": "critical|high|medium|low",
  "title": "Short imperative sentence (max 80 chars)",
  "rationale": "Why this matters for the team (max 200 chars)",
  "payload": {
    // Fields depend on type — include all necessary IDs and values
  },
  "estimatedImpact": 0-100,
  "requiresApproval": true|false
}

PAYLOAD FIELDS BY TYPE:
- create_notion_page: { databaseId, title, status, priority, githubIssueUrl?, description? }
- update_notion_status: { pageId, status, currentStatus }
- link_notion_to_github: { pageId, githubIssueUrl, issueNumber }
- archive_notion_page: { pageId, reason }
- create_github_issue: { title, body, labels?, assignees? }
- close_github_issue: { issueNumber, reason }
- close_github_pr: { prNumber, reason }
- add_github_label: { issueNumber, labels }
- sync_status: { pageId, githubIssueNumber, githubState, currentNotionStatus }`;
function buildUserPrompt(context, learnedContext) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const staleList = context.derived.staleTasks
        .slice(0, 8)
        .map(t => `  • [${t.id}] "${t.title}" status:${t.status ?? 'none'} last:${t.lastEdited.slice(0, 10)}`)
        .join('\n');
    const blockedList = context.derived.blockedItems
        .slice(0, 5)
        .map(t => `  • [${t.id}] "${t.title}"`)
        .join('\n');
    const overdueList = context.derived.overdueTasks
        .slice(0, 5)
        .map(t => `  • [${t.id}] "${t.title}" due:${t.dueDate}`)
        .join('\n');
    const unlinkedList = context.derived.unlinkedIssues
        .slice(0, 8)
        .map(i => `  • #${i.number} "${i.title}" labels:[${i.labels.join(',')}] url:${i.url}`)
        .join('\n');
    const openPRList = context.github.prs
        .filter(p => !p.draft)
        .slice(0, 5)
        .map(p => `  • #${p.number} "${p.title}"`)
        .join('\n');
    return `WORKSPACE SNAPSHOT (${context.snapshotAt}):

HEALTH SCORE: ${context.derived.healthScore}/100
VELOCITY: ${context.derived.velocity} tasks closed in last 7 days

NOTION:
- Total pages: ${context.notion.pages.length}
- Stale tasks (7+ days, not Done): ${context.derived.staleTasks.length}
${staleList}
- Blocked items: ${context.derived.blockedItems.length}
${blockedList}
- Overdue tasks: ${context.derived.overdueTasks.length}
${overdueList}
- Database IDs: ${context.notion.databaseIds.join(', ')}

GITHUB:
- Open issues: ${context.github.issues.length}
- Open PRs: ${context.github.prs.length} (${context.github.prs.filter(p => p.draft).length} drafts)
- Unlinked issues (no Notion task): ${context.derived.unlinkedIssues.length}
${unlinkedList}
- Open non-draft PRs:
${openPRList}

SYNC GAPS: ${context.derived.syncGapCount} total

${learnedContext ? `LEARNED CONTEXT FROM PAST RUNS:\n${learnedContext}` : ''}

Generate tasks now:`;
}
// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------
class TaskGeneratorAgent {
    async generate(context) {
        const cfg = (0, config_1.getConfig)();
        // Load any learned prompt improvements from semantic memory
        const learnedContext = (0, semantic_1.semanticGet)('task_generator.learned_context') ?? '';
        // Build dynamic system prompt (base + any learned additions)
        const learnedSystemAddition = (0, semantic_1.semanticGet)('task_generator.system_prompt_addition') ?? '';
        const systemPrompt = learnedSystemAddition
            ? `${BASE_SYSTEM_PROMPT}\n\nLEARNED REFINEMENTS:\n${learnedSystemAddition}`
            : BASE_SYSTEM_PROMPT;
        await rate_limiter_1.claudeLimiter.acquire('claude');
        let lastError;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const msg = await client.messages.create({
                    model: cfg.ANTHROPIC_MODEL,
                    max_tokens: 4096,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: buildUserPrompt(context, learnedContext) }],
                });
                const text = msg.content.find(b => b.type === 'text')?.text ?? '[]';
                const clean = text.replace(/```json\n?|```/g, '').trim();
                const tasks = JSON.parse(clean);
                // Ensure all tasks have valid IDs
                return tasks.map(t => ({
                    ...t,
                    id: t.id && t.id !== 'uuid-v4' ? t.id : crypto.randomUUID(),
                }));
            }
            catch (err) {
                lastError = err;
                const delay = 1000 * Math.pow(2, attempt);
                console.warn(`[TaskGenerator] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, err);
                await new Promise(r => setTimeout(r, delay));
            }
        }
        console.error('[TaskGenerator] All attempts failed, returning empty list');
        return [];
    }
}
exports.TaskGeneratorAgent = TaskGeneratorAgent;
//# sourceMappingURL=task_generator.js.map