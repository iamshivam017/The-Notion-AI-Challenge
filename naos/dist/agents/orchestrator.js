"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorAgent = void 0;
const p_limit_1 = __importDefault(require("p-limit"));
const task_generator_1 = require("./task_generator");
const prioritizer_1 = require("./prioritizer");
const executor_1 = require("./executor");
const reviewer_1 = require("./reviewer");
const self_improver_1 = require("./self_improver");
const audit_log_1 = require("../safety/audit_log");
const config_1 = require("../config");
const episodic_1 = require("../memory/episodic");
const builder_1 = require("../context/builder");
// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------
class OrchestratorAgent {
    taskGen = new task_generator_1.TaskGeneratorAgent();
    prioritizer = new prioritizer_1.PrioritizerAgent();
    executor = new executor_1.ExecutorAgent();
    reviewer = new reviewer_1.ReviewerAgent();
    selfImprover = new self_improver_1.SelfImproverAgent();
    async run(context) {
        const cfg = (0, config_1.getConfig)();
        const runId = crypto.randomUUID();
        const startedAt = new Date().toISOString();
        (0, episodic_1.clearEpisodicMemory)();
        audit_log_1.auditLog.record({
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
        topTasks.forEach((t, i) => console.log(`   ${i + 1}. [${t.priority.toUpperCase()}] ${t.title} (impact: ${t.estimatedImpact})`));
        // ── Step 3: Review (quality gate) ──────────────────────────────────────
        console.log('\n🔍 Step 3: Reviewing tasks...');
        const limit = (0, p_limit_1.default)(cfg.MAX_CONCURRENT_AGENTS);
        const reviewResults = await Promise.all(topTasks.map(task => limit(() => this.reviewer.assess(task, context))));
        const approvedTasks = reviewResults
            .filter(r => r.approved)
            .map(r => r.task);
        console.log(`   Approved: ${approvedTasks.length}/${topTasks.length}`);
        // ── Step 4: Execute ────────────────────────────────────────────────────
        console.log('\n⚡ Step 4: Executing tasks...');
        const execResults = await Promise.allSettled(approvedTasks.map(task => limit(() => this.executor.execute(task))));
        const succeeded = execResults.filter(r => r.status === 'fulfilled').length;
        const failed = execResults.filter(r => r.status === 'rejected').length;
        console.log(`   Succeeded: ${succeeded} | Failed: ${failed}`);
        // Invalidate cache after writes
        if (succeeded > 0 && !cfg.DRY_RUN) {
            (0, builder_1.invalidateContextCache)();
        }
        // ── Step 5: Self-improvement ───────────────────────────────────────────
        console.log('\n🧠 Step 5: Self-improving...');
        const improvements = await this.selfImprover.analyze(approvedTasks, execResults, context);
        improvements.forEach(i => console.log(`   💡 ${i}`));
        const completedAt = new Date().toISOString();
        const result = {
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
        audit_log_1.auditLog.record({
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
exports.OrchestratorAgent = OrchestratorAgent;
//# sourceMappingURL=orchestrator.js.map