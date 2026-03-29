import Anthropic from '@anthropic-ai/sdk';
import { getConfig } from '../config';
import { claudeLimiter } from '../safety/rate_limiter';
import { semanticGet, semanticSet } from '../memory/semantic';
import type { AgentTask } from './orchestrator';
import type { UnifiedContext } from '../context/builder';

const client = new Anthropic();

interface ImprovementRecord {
  timestamp: string;
  runHealthScore: number;
  failureRate: number;
  suggestions: string[];
  appliedTo: ('task_generator' | 'prioritizer' | 'reviewer')[];
}

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

export class SelfImproverAgent {
  async analyze(
    tasks: AgentTask[],
    results: PromiseSettledResult<void>[],
    context: UnifiedContext,
  ): Promise<string[]> {
    const cfg = getConfig();

    const failed = results.filter(r => r.status === 'rejected').length;
    const failureRate = tasks.length > 0 ? failed / tasks.length : 0;

    // Only improve if there's something to act on
    if (failureRate === 0 && context.derived.healthScore > 80) {
      return ['Workspace healthy — no adjustments needed this cycle'];
    }

    const history = semanticGet<ImprovementRecord[]>('self_improver.history') ?? [];
    const recentHistory = history.slice(-5);

    await claudeLimiter.acquire('claude');

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
  .map((r, i) => (r.status === 'rejected' ? `- ${tasks[i]?.type}: ${(r as any).reason}` : null))
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
      const result = JSON.parse(clean) as {
        suggestions: string[];
        taskGeneratorAddition?: string | null;
        prioritizerWeightAdjustment?: Record<string, unknown> | null;
        learnedContext?: string | null;
      };

      // Persist learnings to semantic memory
      if (result.taskGeneratorAddition) {
        const existing = semanticGet<string>('task_generator.system_prompt_addition') ?? '';
        semanticSet('task_generator.system_prompt_addition',
          existing ? `${existing}\n- ${result.taskGeneratorAddition}` : result.taskGeneratorAddition,
        );
      }

      if (result.learnedContext) {
        semanticSet('task_generator.learned_context', result.learnedContext);
      }

      if (result.prioritizerWeightAdjustment) {
        const currentWeights = semanticGet('prioritizer.weights') ?? {};
        semanticSet('prioritizer.weights', {
          ...(currentWeights as object),
          ...result.prioritizerWeightAdjustment,
        });
      }

      // Append to history
      const record: ImprovementRecord = {
        timestamp: new Date().toISOString(),
        runHealthScore: context.derived.healthScore,
        failureRate,
        suggestions: result.suggestions ?? [],
        appliedTo: [
          ...(result.taskGeneratorAddition ? ['task_generator' as const] : []),
          ...(result.prioritizerWeightAdjustment ? ['prioritizer' as const] : []),
        ],
      };
      semanticSet('self_improver.history', [...history, record]);

      return result.suggestions ?? ['Analysis complete — no suggestions this cycle'];
    } catch (err) {
      console.error('[SelfImprover] Analysis failed:', err);
      return ['Self-improvement analysis failed this cycle'];
    }
  }
}
