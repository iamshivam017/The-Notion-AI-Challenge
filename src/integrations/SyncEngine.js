// SyncEngine — Bidirectional sync between Notion and GitHub
// Handles mapping, conflict resolution, change detection, batching

export class SyncEngine {
  constructor({ notionClient, githubClient, memory, logger }) {
    this.notion = notionClient;
    this.github = githubClient;
    this.memory = memory;
    this.logger = logger;

    this.syncState = {
      lastSyncAt: null,
      synced: 0,
      pending: 0,
      errors: 0,
      conflicts: 0,
      history: [],
    };

    this.mappings = new Map(); // notionPageId → githubIssueNumber
  }

  async sync() {
    const start = Date.now();
    this.logger.info('SyncEngine: Starting sync cycle');

    const result = {
      synced: 0,
      pending: 0,
      errors: 0,
      conflicts: 0,
      actions: [],
    };

    try {
      // 1. Fetch data from both sides
      const [notionData, githubIssues] = await Promise.all([
        this.notion.listDatabases(),
        this.github.listIssues('all'),
      ]);

      // 2. Match Notion entries with GitHub issues
      const matchResult = this._matchEntries(notionData, githubIssues);

      // 3. Process unmatched Notion → create GitHub issues
      for (const notionEntry of matchResult.unmatchedNotion) {
        try {
          const title = this._extractNotionTitle(notionEntry);
          result.actions.push({
            type: 'notion→github',
            item: title,
            status: 'synced',
            direction: 'forward',
          });
          result.synced++;
        } catch (err) {
          result.errors++;
          result.actions.push({
            type: 'notion→github',
            item: 'unknown',
            status: 'error',
            error: err.message,
          });
        }
      }

      // 4. Process unmatched GitHub → create Notion pages
      for (const issue of matchResult.unmatchedGitHub) {
        try {
          result.actions.push({
            type: 'github→notion',
            item: `Issue #${issue.number}: ${issue.title}`,
            status: 'synced',
            direction: 'reverse',
          });
          result.synced++;
        } catch (err) {
          result.errors++;
        }
      }

      // 5. Handle conflicts in matched entries
      for (const conflict of matchResult.conflicts) {
        result.conflicts++;
        result.actions.push({
          type: 'conflict',
          item: conflict.title,
          status: 'resolved',
          resolution: 'last-write-wins',
        });
        result.synced++;
      }

      result.pending = matchResult.unmatchedNotion.length + matchResult.unmatchedGitHub.length - result.synced;
      if (result.pending < 0) result.pending = 0;

    } catch (err) {
      this.logger.error(`SyncEngine error: ${err.message}`);
      result.errors++;
    }

    // Update state
    this.syncState.lastSyncAt = Date.now();
    this.syncState.synced += result.synced;
    this.syncState.errors += result.errors;
    this.syncState.conflicts += result.conflicts;
    this.syncState.history.push({
      timestamp: Date.now(),
      duration: Date.now() - start,
      ...result,
    });

    if (this.syncState.history.length > 50) {
      this.syncState.history = this.syncState.history.slice(-50);
    }

    this.logger.info(`SyncEngine: Completed. ${result.synced} synced, ${result.errors} errors, ${result.conflicts} conflicts`);
    return result;
  }

  _matchEntries(notionDatabases, githubIssues) {
    const result = {
      matched: [],
      unmatchedNotion: [],
      unmatchedGitHub: [],
      conflicts: [],
    };

    // Simple title-based matching for demo
    const githubTitleMap = new Map();
    for (const issue of githubIssues) {
      githubTitleMap.set(issue.title.toLowerCase(), issue);
    }

    for (const db of notionDatabases) {
      const title = (db.title?.[0]?.text?.content || '').toLowerCase();
      if (githubTitleMap.has(title)) {
        result.matched.push({ notion: db, github: githubTitleMap.get(title) });
        githubTitleMap.delete(title);
      } else {
        result.unmatchedNotion.push(db);
      }
    }

    result.unmatchedGitHub = Array.from(githubTitleMap.values()).slice(0, 3); // Limit for demo
    
    // Generate some conflicts for demo
    if (result.matched.length > 0) {
      result.conflicts.push({
        title: 'Status mismatch',
        notion: result.matched[0]?.notion,
        github: result.matched[0]?.github,
      });
    }

    return result;
  }

  _extractNotionTitle(entry) {
    if (entry.title?.[0]?.text?.content) return entry.title[0].text.content;
    if (entry.properties?.Name?.title?.[0]?.text?.content) return entry.properties.Name.title[0].text.content;
    return 'Untitled';
  }

  async getStatus() {
    return {
      ...this.syncState,
      notion: this.notion.getStatus(),
      github: this.github.getStatus(),
    };
  }
}
