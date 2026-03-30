// NotionClient — Wrapper around @notionhq/client
// Provides CRUD, workspace scanning, error handling, rate limiting, and demo mode

export class NotionClient {
  constructor({ token, demoMode = false, logger }) {
    this.demoMode = demoMode || !token || token.startsWith('your_');
    this.logger = logger;
    this.rateLimitRemaining = 100;
    this.requestCount = 0;

    if (!this.demoMode) {
      import('@notionhq/client').then(({ Client }) => {
        this.client = new Client({ auth: token });
        this.logger.info('Notion client initialized with live token');
      }).catch(err => {
        this.logger.warn(`Notion SDK not available: ${err.message}. Falling back to demo mode.`);
        this.demoMode = true;
      });
    } else {
      this.logger.info('Notion client initialized in DEMO mode');
    }
  }

  async listDatabases() {
    if (this.demoMode) return this._mockDatabases();
    try {
      this.requestCount++;
      const response = await this.client.search({ filter: { property: 'object', value: 'database' } });
      this.rateLimitRemaining--;
      return response.results;
    } catch (err) {
      this.logger.error(`Notion listDatabases failed: ${err.message}`);
      throw err;
    }
  }

  async queryDatabase(databaseId, filter = {}) {
    if (this.demoMode) return this._mockDatabaseEntries(databaseId);
    try {
      this.requestCount++;
      const response = await this.client.databases.query({ database_id: databaseId, ...filter });
      this.rateLimitRemaining--;
      return response.results;
    } catch (err) {
      this.logger.error(`Notion queryDatabase failed: ${err.message}`);
      throw err;
    }
  }

  async createPage(title, properties = {}, parentDatabaseId = null) {
    if (this.demoMode) return this._mockCreatePage(title);
    try {
      this.requestCount++;
      const response = await this.client.pages.create({
        parent: parentDatabaseId
          ? { database_id: parentDatabaseId }
          : { page_id: 'root' },
        properties: {
          title: { title: [{ text: { content: title } }] },
          ...properties,
        },
      });
      this.rateLimitRemaining--;
      return response;
    } catch (err) {
      this.logger.error(`Notion createPage failed: ${err.message}`);
      throw err;
    }
  }

  async updatePage(pageId, properties) {
    if (this.demoMode) return { id: pageId, updated: true };
    try {
      this.requestCount++;
      const response = await this.client.pages.update({ page_id: pageId, properties });
      this.rateLimitRemaining--;
      return response;
    } catch (err) {
      this.logger.error(`Notion updatePage failed: ${err.message}`);
      throw err;
    }
  }

  getStatus() {
    return {
      mode: this.demoMode ? 'demo' : 'live',
      requestCount: this.requestCount,
      rateLimitRemaining: this.rateLimitRemaining,
    };
  }

  // --- Mock Data for Demo Mode ---
  _mockDatabases() {
    return [
      { id: 'db-001', title: [{ text: { content: 'Project Tracker' } }], object: 'database', created_time: '2025-01-15' },
      { id: 'db-002', title: [{ text: { content: 'Sprint Board' } }], object: 'database', created_time: '2025-02-01' },
      { id: 'db-003', title: [{ text: { content: 'Bug Reports' } }], object: 'database', created_time: '2025-03-10' },
      { id: 'db-004', title: [{ text: { content: 'Team Wiki' } }], object: 'database', created_time: '2025-01-01' },
      { id: 'db-005', title: [{ text: { content: 'Meeting Notes' } }], object: 'database', created_time: '2024-12-15' },
    ];
  }

  _mockDatabaseEntries(dbId) {
    const entries = {
      'db-001': [
        { id: 'pg-001', properties: { Name: { title: [{ text: { content: 'NAOS Core Engine' } }] }, Status: { status: { name: 'In Progress' } } } },
        { id: 'pg-002', properties: { Name: { title: [{ text: { content: 'Dashboard UI' } }] }, Status: { status: { name: 'Not Started' } } } },
        { id: 'pg-003', properties: { Name: { title: [{ text: { content: 'API Integration' } }] }, Status: { status: { name: 'Done' } } } },
        { id: 'pg-004', properties: { Name: { title: [{ text: { content: 'Memory System' } }] }, Status: { status: { name: 'In Progress' } } } },
        { id: 'pg-005', properties: { Name: { title: [{ text: { content: 'Agent Framework' } }] }, Status: { status: { name: 'Done' } } } },
      ],
      'db-003': [
        { id: 'bg-001', properties: { Name: { title: [{ text: { content: 'Auth token refresh fails' } }] }, Priority: { select: { name: 'High' } } } },
        { id: 'bg-002', properties: { Name: { title: [{ text: { content: 'Dashboard layout broken on mobile' } }] }, Priority: { select: { name: 'Medium' } } } },
        { id: 'bg-003', properties: { Name: { title: [{ text: { content: 'Memory leak in sync loop' } }] }, Priority: { select: { name: 'Critical' } } } },
      ],
    };
    return entries[dbId] || [];
  }

  _mockCreatePage(title) {
    return {
      id: `pg-${Date.now()}`,
      object: 'page',
      created_time: new Date().toISOString(),
      properties: { title: { title: [{ text: { content: title } }] } },
    };
  }
}
