"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelfImproverAgent = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const config_1 = require("../config");
const rate_limiter_1 = require("../safety/rate_limiter");
const semantic_1 = require("../memory/semantic");
const client = new sdk_1.default();
const SYSTEM_PROMPT = `You are NAOS Self-Improver — a meta-agent that analyzes run outcomes and suggests concrete, actionable improvements to other agents in the system.

You have access to:
- Run statistics (tasks executed, failures, health score)
- Historical improvement records
- Workspace signals (velocity, stale tasks, sync gaps)

Your job is to output JSON with these fields:
{
  "suggestions": ["concrete suggestion 1", "concrete suggestion 2"],
  "taskGeneratorAddition": "Additional rule or context to add to task generator system prompt (or null)",
  "prioritizerWeightAdjustment": { "field": "new value" } or null,
  "learnedContext": "Key facts about this workspace to remember for next run (or null)"
}

Be specific. "Focus more on stale tasks" is too vague. "Increase staleness weight from 6 to 10 when stale_count > 20" is concrete.`;
class SelfImproverAgent {
    async analyze(tasks, results, context) {
        const cfg = (0, config_1.getConfig)();
        const failed = results.filter(r => r.status === 'rejected').length;
        const failureRate = tasks.length > 0 ? failed / tasks.length : 0;
        // Only improve if there's something to act on
        if (failureRate === 0 && context.derived.healthScore > 80) {
            return ['Workspace healthy — no adjustments needed this cycle'];
        }
        const history = (0, semantic_1.semanticGet)('self_improver.history') ?? [];
        const recentHistory = history.slice(-5);
        await rate_limiter_1.claudeLimiter.acquire('claude');
        try {
            const msg = await client.messages.create({
                model: cfg.ANTHROPIC_MODEL,
                max_tokens: 1024,
                system: SYSTEM_PROMPT,
                messages: [
                    {
                        role: 'user',
                        content: `RUN STATISTICS:
- Tasks generated: ${tasks.length}
- Tasks executed: ${tasks.length - failed}
- Tasks failed: ${failed}
- Failure rate: ${(failureRate * 100).toFixed(1)}%
- Workspace health score: ${context.derived.healthScore}/100
- Stale tasks: ${context.derived.staleTasks.length}
- Unlinked issues: ${context.derived.unlinkedIssues.length}
- Velocity: ${context.derived.velocity} tasks/week

FAILED TASK TYPES:
${results
                            .map((r, i) => (r.status === 'rejected' ? `- ${tasks[i]?.type}: ${r.reason}` : null))
                            .filter(Boolean)
                            .join('\n') || 'None'}

RECENT IMPROVEMENT HISTORY:
${JSON.stringify(recentHistory, null, 2)}

Analyze and suggest improvements:`,
                    },
                ],
            });
            const text = msg.content.find(b => b.type === 'text')?.text ?? '{}';
            const clean = text.replace(/```json\n?|```/g, '').trim();
            const result = JSON.parse(clean);
            // Persist learnings to semantic memory
            if (result.taskGeneratorAddition) {
                const existing = (0, semantic_1.semanticGet)('task_generator.system_prompt_addition') ?? '';
                (0, semantic_1.semanticSet)('task_generator.system_prompt_addition', existing ? `${existing}\n- ${result.taskGeneratorAddition}` : result.taskGeneratorAddition);
            }
            if (result.learnedContext) {
                (0, semantic_1.semanticSet)('task_generator.learned_context', result.learnedContext);
            }
            if (result.prioritizerWeightAdjustment) {
                const currentWeights = (0, semantic_1.semanticGet)('prioritizer.weights') ?? {};
                (0, semantic_1.semanticSet)('prioritizer.weights', {
                    ...currentWeights,
                    ...result.prioritizerWeightAdjustment,
                });
            }
            // Append to history
            const record = {
                timestamp: new Date().toISOString(),
                runHealthScore: context.derived.healthScore,
                failureRate,
                suggestions: result.suggestions ?? [],
                appliedTo: [
                    ...(result.taskGeneratorAddition ? ['task_generator'] : []),
                    ...(result.prioritizerWeightAdjustment ? ['prioritizer'] : []),
                ],
            };
            (0, semantic_1.semanticSet)('self_improver.history', [...history, record]);
            return result.suggestions ?? ['Analysis complete — no suggestions this cycle'];
        }
        catch (err) {
            console.error('[SelfImprover] Analysis failed:', err);
            return ['Self-improvement analysis failed this cycle'];
        }
    }
}
exports.SelfImproverAgent = SelfImproverAgent;
//# sourceMappingURL=self_improver.js.map