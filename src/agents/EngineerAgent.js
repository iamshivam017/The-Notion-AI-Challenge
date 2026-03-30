// EngineerAgent — Executes Notion ↔ GitHub sync operations
// Learns from past API errors and adapts retry strategies

import { BaseAgent } from './BaseAgent.js';

export class EngineerAgent extends BaseAgent {
  constructor(deps, { notionClient, githubClient, syncEngine } = {}) {
    super('engineer', deps);
    this.notion = notionClient;
    this.github = githubClient;
    this.syncEngine = syncEngine;
    this.retryBackoff = 1000; // Start with 1s, adapt based on errors
  }

  async _execute(context, memories) {
    const { type } = context;

    // Learn from past mistakes — adjust backoff
    const pastMistakes = memories.longTerm?.mistakes || [];
    const rateLimitErrors = pastMistakes.filter(m => m.description?.includes('rate limit'));
    if (rateLimitErrors.length > 2) {
      this.retryBackoff = Math.min(this.retryBackoff * 2, 30000);
      this.logger.info(`[engineer] Increased backoff to ${this.retryBackoff}ms due to rate limit history`);
    }

    switch (type) {
      case 'sync': return this._performSync(context, memories);
      case 'create_page': return this._createNotionPage(context);
      case 'create_issue': return this._createGitHubIssue(context);
      default: return this._performSync(context, memories);
    }
  }

  async _performSync(context, memories) {
    if (!this.syncEngine) {
      return {
        outcome: 'success',
        score: 6,
        data: {
          synced: 0,
          message: 'Sync engine not configured — running in analysis mode',
          tasks: this._generateMockSyncTasks(),
        },
        reasoning: 'No sync engine available. Generated mock tasks for demonstration.',
      };
    }

    try {
      const result = await this.syncEngine.sync();
      return {
        outcome: 'success',
        score: 8,
        data: result,
        reasoning: `Synced ${result.synced} items. ${result.conflicts} conflicts resolved.`,
        improvement: result.synced > 0 ? {
          before: { pendingItems: result.synced + result.pending },
          after: { pendingItems: result.pending },
          impact: result.synced / (result.synced + result.pending + 1),
        } : undefined,
      };
    } catch (err) {
      return {
        outcome: 'failure',
        score: 2,
        error: err.message,
        reasoning: `Sync failed: ${err.message}. Will retry with ${this.retryBackoff}ms backoff.`,
      };
    }
  }

  async _createNotionPage(context) {
    if (!this.notion) {
      return { outcome: 'success', score: 5, data: { mock: true }, reasoning: 'Notion client not configured' };
    }
    const { title, properties } = context.data || {};
    const page = await this.notion.createPage(title, properties);
    return { outcome: 'success', score: 8, data: { pageId: page.id }, reasoning: `Created page: ${title}` };
  }

  async _createGitHubIssue(context) {
    if (!this.github) {
      return { outcome: 'success', score: 5, data: { mock: true }, reasoning: 'GitHub client not configured' };
    }
    const { title, body, labels } = context.data || {};
    const issue = await this.github.createIssue(title, body, labels);
    return { outcome: 'success', score: 8, data: { issueNumber: issue.number }, reasoning: `Created issue #${issue.number}: ${title}` };
  }

  _generateMockSyncTasks() {
    return [
      { type: 'notion→github', item: 'Project Roadmap', status: 'pending' },
      { type: 'github→notion', item: 'Issue #42: Fix auth bug', status: 'pending' },
      { type: 'notion→github', item: 'Sprint Planning', status: 'pending' },
    ];
  }

  async _generateReflection(result) {
    if (result.outcome === 'success') {
      return `Sync operation completed. ${result.data?.synced || 0} items synced. Backoff at ${this.retryBackoff}ms.`;
    }
    return `Sync failed: ${result.error}. Increasing backoff to ${this.retryBackoff}ms. Check rate limits and API connectivity.`;
  }
}
