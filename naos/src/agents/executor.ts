import { auditLog } from '../safety/audit_log';
import { requestApproval } from '../safety/human_gate';
import { getConfig } from '../config';
import { remember } from '../memory/episodic';
import {
  createNotionTask,
  updateNotionTaskStatus,
  linkNotionTaskToGitHub,
  archiveStaleNotionTask,
} from '../integrations/notion/tools';
import {
  createGitHubIssueFromNotionTask,
  closeGitHubIssue,
  closeGitHubPR,
  labelGitHubIssue,
} from '../integrations/github/tools';
import type { AgentTask } from './orchestrator';

export class ExecutorAgent {
  async execute(task: AgentTask): Promise<void> {
    const cfg = getConfig();
    const startMs = Date.now();

    // Human approval gate for flagged tasks
    if (task.requiresApproval && cfg.REQUIRE_HUMAN_APPROVAL) {
      const approval = await requestApproval(task);
      if (approval !== 'approved') {
        console.log(`[Executor] Task "${task.title}" ${approval} — skipping`);
        auditLog.record({
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

    let outcome: 'success' | 'failure' = 'failure';
    let error: string | undefined;

    try {
      await this.dispatch(task);
      outcome = 'success';

      // Record in episodic memory so reviewer can skip duplicates
      const entityId = (task.payload?.pageId ?? task.payload?.issueNumber ?? task.id) as string;
      remember(task.type, entityId, task.title);
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : String(err);
      console.error(`[Executor] ✗ "${task.title}":`, error);
      throw err;
    } finally {
      auditLog.record({
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

  private async dispatch(task: AgentTask): Promise<void> {
    switch (task.type) {
      // ── Notion ─────────────────────────────────────────────────────────
      case 'create_notion_page':
        await createNotionTask({
          databaseId: task.payload.databaseId as string,
          title: task.payload.title as string,
          status: task.payload.status as string | undefined,
          priority: task.payload.priority as string | undefined,
          githubIssueUrl: task.payload.githubIssueUrl as string | undefined,
          description: task.payload.description as string | undefined,
        });
        break;

      case 'update_notion_status':
        await updateNotionTaskStatus(
          task.payload.pageId as string,
          task.payload.status as string,
        );
        break;

      case 'link_notion_to_github':
        await linkNotionTaskToGitHub(
          task.payload.pageId as string,
          task.payload.githubIssueUrl as string,
        );
        break;

      case 'archive_notion_page':
        await archiveStaleNotionTask(task.payload.pageId as string);
        break;

      // ── GitHub ─────────────────────────────────────────────────────────
      case 'create_github_issue':
        await createGitHubIssueFromNotionTask({
          title: task.payload.title as string,
          body: task.payload.body as string,
          labels: task.payload.labels as string[] | undefined,
          assignees: task.payload.assignees as string[] | undefined,
        });
        break;

      case 'close_github_issue':
        await closeGitHubIssue(task.payload.issueNumber as number);
        break;

      case 'close_github_pr':
        await closeGitHubPR(task.payload.prNumber as number);
        break;

      case 'add_github_label':
        await labelGitHubIssue(
          task.payload.issueNumber as number,
          task.payload.labels as string[],
        );
        break;

      // ── Bidirectional sync ─────────────────────────────────────────────
      case 'sync_status': {
        const githubState = task.payload.githubState as string;
        const targetStatus = githubState === 'closed' ? 'Done' : 'In Progress';
        await updateNotionTaskStatus(task.payload.pageId as string, targetStatus);
        break;
      }

      default:
        throw new Error(`Unknown task type: ${(task as any).type}`);
    }
  }
}
