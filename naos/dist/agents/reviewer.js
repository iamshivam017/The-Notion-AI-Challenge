"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewerAgent = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const config_1 = require("../config");
const rate_limiter_1 = require("../safety/rate_limiter");
const episodic_1 = require("../memory/episodic");
const client = new sdk_1.default();
const REVIEWER_SYSTEM = `You are NAOS Reviewer — a cautious quality gate agent responsible for approving or rejecting actions before they execute.

REJECT if any of the following are true:
- The action targets a page ID not present in the context
- The rationale is vague, circular, or missing
- The action would cause irreversible data loss (e.g. archive without reason)
- The task is a duplicate of a recently completed action
- The payload is missing required fields for the task type
- The action conflicts with another approved task in this run

APPROVE if:
- The task is clearly scoped and reversible (or has a clear reason for irreversibility)
- All referenced IDs plausibly exist
- The rationale has clear business value

Respond ONLY with JSON: { "approved": boolean, "reason": "brief one-sentence explanation" }
No markdown, no preamble.`;
// Fast-path types that skip LLM review (low risk, reversible)
const FAST_APPROVE_TYPES = ['sync_status', 'add_github_label'];
class ReviewerAgent {
    async assess(task, context) {
        // Check episodic memory — don't act on same entity twice in one run
        if ((0, episodic_1.hasActedOn)(task.payload?.pageId ?? task.payload?.issueNumber, task.type)) {
            console.log(`[Reviewer] Skipping "${task.title}" — already acted on this entity this run`);
            return { approved: false, task };
        }
        // Fast-path: low-risk ops skip expensive LLM review
        if (FAST_APPROVE_TYPES.includes(task.type) && !task.requiresApproval) {
            return { approved: true, task };
        }
        const cfg = (0, config_1.getConfig)();
        await rate_limiter_1.claudeLimiter.acquire('claude');
        // Build a lean context summary — don't send the whole context to avoid token waste
        const pageIds = new Set(context.notion.pages.map(p => p.id));
        const issueNums = new Set(context.github.issues.map(i => i.number));
        const contextSummary = {
            pageCount: context.notion.pages.length,
            knownPageIds: [...pageIds].slice(0, 20),
            knownIssueNumbers: [...issueNums].slice(0, 20),
            staleTasks: context.derived.staleTasks.length,
            unlinkedIssues: context.derived.unlinkedIssues.length,
        };
        try {
            const msg = await client.messages.create({
                model: cfg.ANTHROPIC_MODEL,
                max_tokens: 256,
                system: REVIEWER_SYSTEM,
                messages: [
                    {
                        role: 'user',
                        content: `Task to review:\n${JSON.stringify(task, null, 2)}\n\nContext summary:\n${JSON.stringify(contextSummary, null, 2)}`,
                    },
                ],
            });
            const text = msg.content.find(b => b.type === 'text')?.text ?? '';
            const clean = text.replace(/```json\n?|```/g, '').trim();
            const result = JSON.parse(clean);
            if (!result.approved) {
                console.log(`[Reviewer] ❌ Rejected "${task.title}": ${result.reason}`);
            }
            else {
                console.log(`[Reviewer] ✅ Approved "${task.title}"`);
            }
            return { approved: result.approved, task };
        }
        catch (err) {
            // Fail closed — if reviewer errors, reject the task
            console.error(`[Reviewer] Error assessing "${task.title}" — rejecting:`, err);
            return { approved: false, task };
        }
    }
}
exports.ReviewerAgent = ReviewerAgent;
//# sourceMappingURL=reviewer.js.map