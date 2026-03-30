// GitHubClient — Wrapper around @octokit/rest
// Provides repo operations, error handling, rate limiting, and demo mode

export class GitHubClient {
  constructor({ token, owner, repo, demoMode = false, logger }) {
    this.owner = owner || 'demo-org';
    this.repo = repo || 'demo-repo';
    this.demoMode = demoMode || !token || token.startsWith('your_');
    this.logger = logger;
    this.rateLimitRemaining = 5000;
    this.requestCount = 0;

    if (!this.demoMode) {
      import('@octokit/rest').then(({ Octokit }) => {
        this.octokit = new Octokit({ auth: token });
        this.logger.info('GitHub client initialized with live token');
      }).catch(err => {
        this.logger.warn(`Octokit not available: ${err.message}. Falling back to demo mode.`);
        this.demoMode = true;
      });
    } else {
      this.logger.info('GitHub client initialized in DEMO mode');
    }
  }

  async listIssues(state = 'open') {
    if (this.demoMode) return this._mockIssues(state);
    try {
      this.requestCount++;
      const { data } = await this.octokit.issues.listForRepo({
        owner: this.owner, repo: this.repo, state, per_page: 50,
      });
      this.rateLimitRemaining--;
      return data;
    } catch (err) {
      this.logger.error(`GitHub listIssues failed: ${err.message}`);
      throw err;
    }
  }

  async createIssue(title, body = '', labels = []) {
    if (this.demoMode) return this._mockCreateIssue(title, body, labels);
    try {
      this.requestCount++;
      const { data } = await this.octokit.issues.create({
        owner: this.owner, repo: this.repo, title, body, labels,
      });
      this.rateLimitRemaining--;
      return data;
    } catch (err) {
      this.logger.error(`GitHub createIssue failed: ${err.message}`);
      throw err;
    }
  }

  async updateIssue(issueNumber, updates) {
    if (this.demoMode) return { number: issueNumber, ...updates, updated: true };
    try {
      this.requestCount++;
      const { data } = await this.octokit.issues.update({
        owner: this.owner, repo: this.repo, issue_number: issueNumber, ...updates,
      });
      this.rateLimitRemaining--;
      return data;
    } catch (err) {
      this.logger.error(`GitHub updateIssue failed: ${err.message}`);
      throw err;
    }
  }

  async listPullRequests(state = 'open') {
    if (this.demoMode) return this._mockPRs(state);
    try {
      this.requestCount++;
      const { data } = await this.octokit.pulls.list({
        owner: this.owner, repo: this.repo, state, per_page: 20,
      });
      this.rateLimitRemaining--;
      return data;
    } catch (err) {
      this.logger.error(`GitHub listPullRequests failed: ${err.message}`);
      throw err;
    }
  }

  getStatus() {
    return {
      mode: this.demoMode ? 'demo' : 'live',
      owner: this.owner,
      repo: this.repo,
      requestCount: this.requestCount,
      rateLimitRemaining: this.rateLimitRemaining,
    };
  }

  // --- Mock Data ---
  _mockIssues(state) {
    const issues = [
      { number: 1, title: 'Set up CI/CD pipeline', state: 'open', labels: [{ name: 'infra' }], created_at: '2025-01-20', assignee: { login: 'dev1' } },
      { number: 2, title: 'Implement user authentication', state: 'open', labels: [{ name: 'feature' }, { name: 'security' }], created_at: '2025-01-22', assignee: { login: 'dev2' } },
      { number: 3, title: 'Fix memory leak in sync engine', state: 'open', labels: [{ name: 'bug' }, { name: 'critical' }], created_at: '2025-02-01', assignee: null },
      { number: 4, title: 'Add rate limiting to API', state: 'open', labels: [{ name: 'enhancement' }], created_at: '2025-02-05', assignee: { login: 'dev1' } },
      { number: 5, title: 'Dashboard dark mode', state: 'open', labels: [{ name: 'feature' }, { name: 'ui' }], created_at: '2025-02-10', assignee: null },
      { number: 6, title: 'Write unit tests for agents', state: 'open', labels: [{ name: 'testing' }], created_at: '2025-02-15', assignee: { login: 'dev3' } },
      { number: 7, title: 'Update documentation', state: 'closed', labels: [{ name: 'docs' }], created_at: '2025-01-10', assignee: { login: 'dev2' } },
      { number: 8, title: 'Fix Notion API compatibility', state: 'closed', labels: [{ name: 'bug' }], created_at: '2025-01-25', assignee: { login: 'dev1' } },
      { number: 9, title: 'Optimize database queries', state: 'open', labels: [{ name: 'performance' }], created_at: '2025-03-01', assignee: null },
      { number: 10, title: 'Add webhook support', state: 'open', labels: [{ name: 'feature' }], created_at: '2025-03-05', assignee: { login: 'dev1' } },
    ];
    return state === 'all' ? issues : issues.filter(i => i.state === state);
  }

  _mockCreateIssue(title, body, labels) {
    return {
      number: Math.floor(Math.random() * 1000) + 100,
      title, body,
      labels: labels.map(l => ({ name: l })),
      state: 'open',
      created_at: new Date().toISOString(),
    };
  }

  _mockPRs(state) {
    return [
      { number: 101, title: 'feat: Add memory system', state: 'open', user: { login: 'dev1' }, created_at: '2025-02-20', head: { ref: 'feat/memory' } },
      { number: 102, title: 'fix: Resolve sync conflicts', state: 'open', user: { login: 'dev2' }, created_at: '2025-02-22', head: { ref: 'fix/sync' } },
      { number: 103, title: 'feat: Dashboard redesign', state: 'merged', user: { login: 'dev3' }, created_at: '2025-02-18', head: { ref: 'feat/dashboard' } },
    ];
  }
}
