import pLimit from 'p-limit';
import { TaskGeneratorAgent } from './task_generator';
import { PrioritizerAgent } from './prioritizer';
import { ExecutorAgent } from './executor';
import { ReviewerAgent } from './reviewer';
import { SelfImproverAgent } from './self_improver';
import { auditLog } from '../safety/audit_log';
import { getConfig } from '../config';
import { clearEpisodicMemory } from '../memory/episodic';
import { invalidateContextCache } from '../context/builder';
import type { UnifiedContext } from '../context/builder';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type TaskType =
  | 'create_notion_page'
  | 'update_notion_status'
  | 'link_notion_to_github'
  | 'archive_notion_page'
  | 'create_github_issue'
  | 'close_github_issue'
  | 'close_github_pr'
  | 'add_github_label'
  | 'sync_status';

export interface AgentTask {
  id: string;
  type: TaskType;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  rationale: string;
  payload: Record<string, unknown>;
  estimatedImpact: number;   // 0–100
  requiresApproval: boolean;
}

export interface RunResult {
  runId: string;
  startedAt: string;
  completedAt: string;
  tasksGenerated: number;
  tasksPassed: number;
  tasksExecuted: number;
  tasksFailed: number;
  improvements: string[];
  healthScoreBefore: number;
  healthScoreAfter?: number;
  dryRun: boolean;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------
export class OrchestratorAgent {
  private readonly taskGen = new TaskGeneratorAgent();
  private readonly prioritizer = new PrioritizerAgent();
  private readonly executor = new ExecutorAgent();
  private readonly reviewer = new ReviewerAgent();
  private readonly selfImprover = new SelfImproverAgent();

  async run(context: UnifiedContext): Promise<RunResult> {
    const cfg = getConfig();
    const runId = crypto.randomUUID();
    const startedAt = new Date().toISOString();

    clearEpisodicMemory();

    auditLog.record({
      agent: 'orchestrator',
      action: 'run_start',
      payload: {
        runId,
        snapshotAt: context.snapshotAt,
        healthScore: context.derived.healthScore,
        pageCount: context.notion.pages.length,
        openIssues: context.github.issues.length,
      },
      dryRun: cfg.DRY_RUN,
      approved: true,
      outcome: 'success',
    });

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🚀 NAOS Run [${runId.slice(0, 8)}] — ${cfg.DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    console.log(`   Workspace: ${context.notion.pages.length} pages | ${context.github.issues.length} issues`);
    console.log(`   Health score: ${context.derived.healthScore}/100`);
    console.log(`   Stale tasks: ${context.derived.staleTasks.length} | Unlinked issues: ${context.derived.unlinkedIssues.length}`);
    console.log(`${'─'.repeat(60)}\n`);

    // ── Step 1: Generate candidate tasks ───────────────────────────────────
    console.log('📋 Step 1: Generating tasks...');
    const rawTasks = await this.taskGen.generate(context);
    console.log(`   Generated: ${rawTasks.length} candidate tasks`);

    // ── Step 2: Prioritize ─────────────────────────────────────────────────
    console.log('🎯 Step 2: Prioritizing...');
    const prioritized = await this.prioritizer.rank(rawTasks, context);
    const topTasks = prioritized.slice(0, cfg.MAX_ACTIONS_PER_RUN);
    console.log(`   Top ${topTasks.length} tasks selected`);
    topTasks.forEach((t, i) =>
      console.log(`   ${i + 1}. [${t.priority.toUpperCase()}] ${t.title} (impact: ${t.estimatedImpact})`),
    );

    // ── Step 3: Review (quality gate) ──────────────────────────────────────
    console.log('\n🔍 Step 3: Reviewing tasks...');
    const limit = pLimit(cfg.MAX_CONCURRENT_AGENTS);
    const reviewResults = await Promise.all(
      topTasks.map(task => limit(() => this.reviewer.assess(task, context))),
    );
    const approvedTasks = reviewResults
      .filter(r => r.approved)
      .map(r => r.task);
    console.log(`   Approved: ${approvedTasks.length}/${topTasks.length}`);

    // ── Step 4: Execute ────────────────────────────────────────────────────
    console.log('\n⚡ Step 4: Executing tasks...');
    const execResults = await Promise.allSettled(
      approvedTasks.map(task => limit(() => this.executor.execute(task))),
    );
    const succeeded = execResults.filter(r => r.status === 'fulfilled').length;
    const failed = execResults.filter(r => r.status === 'rejected').length;
    console.log(`   Succeeded: ${succeeded} | Failed: ${failed}`);

    // Invalidate cache after writes
    if (succeeded > 0 && !cfg.DRY_RUN) {
      invalidateContextCache();
    }

    // ── Step 5: Self-improvement ───────────────────────────────────────────
    console.log('\n🧠 Step 5: Self-improving...');
    const improvements = await this.selfImprover.analyze(approvedTasks, execResults, context);
    improvements.forEach(i => console.log(`   💡 ${i}`));

    const completedAt = new Date().toISOString();
    const result: RunResult = {
      runId,
      startedAt,
      completedAt,
      tasksGenerated: rawTasks.length,
      tasksPassed: approvedTasks.length,
      tasksExecuted: succeeded,
      tasksFailed: failed,
      improvements,
      healthScoreBefore: context.derived.healthScore,
      dryRun: cfg.DRY_RUN,
    };

    auditLog.record({
      agent: 'orchestrator',
      action: 'run_complete',
      payload: result,
      dryRun: cfg.DRY_RUN,
      approved: true,
      outcome: 'success',
    });

    console.log(`\n✅ Run complete in ${Date.now() - new Date(startedAt).getTime()}ms`);
    console.log(`${'─'.repeat(60)}\n`);
    return result;
  }
}
