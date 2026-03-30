// MockNotionWorkspace — Simulated messy Notion workspace for demo

export class MockNotionWorkspace {
  constructor() {
    this.databases = this._generateDatabases();
    this.pages = this._generatePages();
  }

  _generateDatabases() {
    return [
      { id: 'db-proj', name: 'Project Tracker', entries: 18, status: 'active', lastEdited: '2025-03-20', health: 'messy' },
      { id: 'db-sprint', name: 'Sprint Board', entries: 24, status: 'active', lastEdited: '2025-03-25', health: 'ok' },
      { id: 'db-bugs', name: 'Bug Reports', entries: 47, status: 'active', lastEdited: '2025-03-28', health: 'critical' },
      { id: 'db-wiki', name: 'Team Wiki', entries: 92, status: 'stale', lastEdited: '2024-11-15', health: 'abandoned' },
      { id: 'db-meetings', name: 'Meeting Notes', entries: 156, status: 'active', lastEdited: '2025-03-28', health: 'messy' },
    ];
  }

  _generatePages() {
    const statuses = ['Not Started', 'In Progress', 'Done', 'Blocked', 'Cancelled'];
    const priorities = ['Critical', 'High', 'Medium', 'Low', 'None'];
    const assignees = ['Alice', 'Bob', 'Charlie', 'Diana', null, null];

    const pages = [];
    const titles = [
      'Set up authentication', 'Design database schema', 'Implement API endpoints',
      'Write unit tests', 'Deploy to staging', 'Code review process', 'Update documentation',
      'Performance audit', 'Security review', 'Dashboard wireframes',
      'Mobile responsive fix', 'CI/CD pipeline setup', 'Error monitoring integration',
      'User onboarding flow', 'Analytics dashboard', 'Email notification system',
      'Search functionality', 'Data export feature', 'Role-based access control',
      'API rate limiting', 'WebSocket integration', 'Backup automation',
      'Load testing', 'Accessibility audit', 'Localization support',
      // Messy entries (duplicates, vague, stale)
      'TODO: fix thing', 'URGENT!!!', 'test page delete later', 'Copy of Design Spec',
      'Meeting notes 2024-01-15', 'old brainstorm DO NOT DELETE', 'asdf',
      'Untitled', 'Untitled (1)', 'DRAFT - something', 'WIP: unknown',
    ];

    for (let i = 0; i < titles.length; i++) {
      pages.push({
        id: `page-${String(i + 1).padStart(3, '0')}`,
        title: titles[i],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        assignee: assignees[Math.floor(Math.random() * assignees.length)],
        database: this.databases[Math.floor(Math.random() * this.databases.length)].id,
        createdAt: this._randomDate(),
        lastEdited: this._randomDate(),
        isMessy: i >= 25,
      });
    }
    return pages;
  }

  _randomDate() {
    const start = new Date('2024-06-01');
    const end = new Date('2025-03-28');
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
  }

  getSnapshot() {
    return {
      databases: this.databases,
      totalPages: this.pages.length,
      messyPages: this.pages.filter(p => p.isMessy).length,
      stalePages: this.pages.filter(p => new Date(p.lastEdited) < new Date('2025-01-01')).length,
      unassigned: this.pages.filter(p => !p.assignee).length,
      byStatus: this._countBy('status'),
      byPriority: this._countBy('priority'),
    };
  }

  _countBy(field) {
    const counts = {};
    for (const p of this.pages) {
      counts[p[field]] = (counts[p[field]] || 0) + 1;
    }
    return counts;
  }
}
