// MockGitHubRepo — Simulated GitHub repository for demo

export class MockGitHubRepo {
  constructor() {
    this.issues = this._generateIssues();
    this.pullRequests = this._generatePRs();
  }

  _generateIssues() {
    const labels = ['bug', 'feature', 'enhancement', 'documentation', 'security', 'performance', 'critical', 'good-first-issue'];
    const states = ['open', 'closed'];
    const milestones = ['v1.0', 'v1.1', 'v2.0', null];
    const assignees = ['octocat', 'dev-jane', 'dev-john', null, null];

    const titles = [
      'Authentication fails with expired tokens',
      'Add dark mode support',
      'Memory leak in WebSocket handler',
      'Implement rate limiting for API endpoints',
      'Dashboard crashes on empty state',
      'Add unit tests for sync engine',
      'Update README with setup instructions',
      'Fix CORS issues in production',
      'Implement webhook verification',
      'Add pagination to issue listing',
      'Optimize database queries for large datasets',
      'Fix timezone handling in date displays',
      'Add search functionality to dashboard',
      'Implement retry logic for failed API calls',
      'Create onboarding tutorial',
      'Fix mobile layout issues',
      'Add logging middleware',
      'Implement data export feature',
      'Fix broken link in documentation',
      'Add TypeScript type definitions',
      'Performance: slow page load on dashboard',
      'Security: validate all user inputs',
      'Feature: real-time notifications',
      'Bug: duplicate entries on rapid sync',
      'Enhancement: batch operation support',
      'Add health check endpoint',
      'Fix: agent state not persisting',
      'Implement circuit breaker pattern',
      'Add metrics endpoint for monitoring',
      'Fix: race condition in sync engine',
    ];

    return titles.map((title, i) => ({
      number: i + 1,
      title,
      state: i < 22 ? 'open' : 'closed',
      labels: [labels[Math.floor(Math.random() * labels.length)]],
      milestone: milestones[Math.floor(Math.random() * milestones.length)],
      assignee: assignees[Math.floor(Math.random() * assignees.length)],
      created_at: this._randomDate(),
      updated_at: this._randomDate(),
      comments: Math.floor(Math.random() * 10),
    }));
  }

  _generatePRs() {
    return [
      { number: 101, title: 'feat: implement memory system', state: 'open', author: 'dev-jane', branch: 'feat/memory', reviewers: ['dev-john'], additions: 450, deletions: 23 },
      { number: 102, title: 'fix: resolve sync race condition', state: 'open', author: 'dev-john', branch: 'fix/sync-race', reviewers: ['dev-jane'], additions: 89, deletions: 34 },
      { number: 103, title: 'feat: dashboard redesign', state: 'merged', author: 'octocat', branch: 'feat/dashboard-v2', reviewers: ['dev-jane', 'dev-john'], additions: 1200, deletions: 800 },
      { number: 104, title: 'docs: update API documentation', state: 'merged', author: 'dev-jane', branch: 'docs/api', reviewers: [], additions: 145, deletions: 12 },
      { number: 105, title: 'feat: add agent self-reflection', state: 'open', author: 'dev-john', branch: 'feat/agent-reflection', reviewers: ['octocat'], additions: 320, deletions: 45 },
      { number: 106, title: 'fix: rate limit handling', state: 'open', author: 'octocat', branch: 'fix/rate-limit', reviewers: ['dev-jane'], additions: 67, deletions: 18 },
      { number: 107, title: 'chore: upgrade dependencies', state: 'merged', author: 'dev-jane', branch: 'chore/deps', reviewers: [], additions: 234, deletions: 189 },
      { number: 108, title: 'feat: evolution engine', state: 'open', author: 'dev-john', branch: 'feat/evolution', reviewers: ['dev-jane', 'octocat'], additions: 567, deletions: 12 },
      { number: 109, title: 'test: add integration tests', state: 'open', author: 'octocat', branch: 'test/integration', reviewers: ['dev-john'], additions: 890, deletions: 0 },
      { number: 110, title: 'feat: WebSocket real-time updates', state: 'merged', author: 'dev-jane', branch: 'feat/ws', reviewers: ['dev-john'], additions: 234, deletions: 78 },
    ];
  }

  _randomDate() {
    const start = new Date('2025-01-01');
    const end = new Date('2025-03-28');
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
  }

  getSnapshot() {
    return {
      totalIssues: this.issues.length,
      openIssues: this.issues.filter(i => i.state === 'open').length,
      closedIssues: this.issues.filter(i => i.state === 'closed').length,
      unassignedIssues: this.issues.filter(i => !i.assignee).length,
      totalPRs: this.pullRequests.length,
      openPRs: this.pullRequests.filter(p => p.state === 'open').length,
      mergedPRs: this.pullRequests.filter(p => p.state === 'merged').length,
      byLabel: this._countByLabel(),
    };
  }

  _countByLabel() {
    const counts = {};
    for (const issue of this.issues) {
      for (const label of issue.labels) {
        counts[label] = (counts[label] || 0) + 1;
      }
    }
    return counts;
  }
}
