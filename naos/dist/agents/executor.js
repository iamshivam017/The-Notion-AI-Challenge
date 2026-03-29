"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutorAgent = void 0;
const audit_log_1 = require("../safety/audit_log");
const human_gate_1 = require("../safety/human_gate");
const config_1 = require("../config");
const episodic_1 = require("../memory/episodic");
const tools_1 = require("../integrations/notion/tools");
const tools_2 = require("../integrations/github/tools");
class ExecutorAgent {
    async execute(task) {
        const cfg = (0, config_1.getConfig)();
        const startMs = Date.now();
        // Human approval gate for flagged tasks
        if (task.requiresApproval && cfg.REQUIRE_HUMAN_APPROVAL) {
            const approval = await (0, human_gate_1.requestApproval)(task);
            if (approval !== 'approved') {
                console.log(`[Executor] Task "${task.title}" ${approval} — skipping`);
                audit_log_1.auditLog.record({
                    agent: 'executor',
                    action: task.type,
                    payload: task.payload,
                    dryRun: cfg.DRY_RUN,
                    approved: false,
                    outcome: 'skipped',
                    durationMs: Date.now() - startMs,
                });
                return;
            }
        }
        console.log(`[Executor] ▶ "${task.title}" [${task.type}]${cfg.DRY_RUN ? ' (DRY RUN)' : ''}`);
        let outcome = 'failure';
        let error;
        try {
            await this.dispatch(task);
            outcome = 'success';
            // Record in episodic memory so reviewer can skip duplicates
            const entityId = (task.payload?.pageId ?? task.payload?.issueNumber ?? task.id);
            (0, episodic_1.remember)(task.type, entityId, task.title);
        }
        catch (err) {
            error = err instanceof Error ? err.message : String(err);
            console.error(`[Executor] ✗ "${task.title}":`, error);
            throw err;
        }
        finally {
            audit_log_1.auditLog.record({
                agent: 'executor',
                action: task.type,
                payload: task.payload,
                dryRun: cfg.DRY_RUN,
                approved: true,
                outcome,
                error,
                durationMs: Date.now() - startMs,
            });
        }
    }
    async dispatch(task) {
        switch (task.type) {
            // ── Notion ─────────────────────────────────────────────────────────
            case 'create_notion_page':
                await (0, tools_1.createNotionTask)({
                    databaseId: task.payload.databaseId,
                    title: task.payload.title,
                    status: task.payload.status,
                    priority: task.payload.priority,
                    githubIssueUrl: task.payload.githubIssueUrl,
                    description: task.payload.description,
                });
                break;
            case 'update_notion_status':
                await (0, tools_1.updateNotionTaskStatus)(task.payload.pageId, task.payload.status);
                break;
            case 'link_notion_to_github':
                await (0, tools_1.linkNotionTaskToGitHub)(task.payload.pageId, task.payload.githubIssueUrl);
                break;
            case 'archive_notion_page':
                await (0, tools_1.archiveStaleNotionTask)(task.payload.pageId);
                break;
            // ── GitHub ─────────────────────────────────────────────────────────
            case 'create_github_issue':
                await (0, tools_2.createGitHubIssueFromNotionTask)({
                    title: task.payload.title,
                    body: task.payload.body,
                    labels: task.payload.labels,
                    assignees: task.payload.assignees,
                });
                break;
            case 'close_github_issue':
                await (0, tools_2.closeGitHubIssue)(task.payload.issueNumber);
                break;
            case 'close_github_pr':
                await (0, tools_2.closeGitHubPR)(task.payload.prNumber);
                break;
            case 'add_github_label':
                await (0, tools_2.labelGitHubIssue)(task.payload.issueNumber, task.payload.labels);
                break;
            // ── Bidirectional sync ─────────────────────────────────────────────
            case 'sync_status': {
                const githubState = task.payload.githubState;
                const targetStatus = githubState === 'closed' ? 'Done' : 'In Progress';
                await (0, tools_1.updateNotionTaskStatus)(task.payload.pageId, targetStatus);
                break;
            }
            default:
                throw new Error(`Unknown task type: ${task.type}`);
        }
    }
}
exports.ExecutorAgent = ExecutorAgent;
//# sourceMappingURL=executor.js.map