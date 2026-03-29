import { PrioritizerAgent } from '../../src/agents/prioritizer';
import type { AgentTask } from '../../src/agents/orchestrator';
import type { UnifiedContext } from '../../src/context/builder';

const makeTask = (overrides: Partial<AgentTask>): AgentTask => ({
  id: crypto.randomUUID(),
  type: 'update_notion_status',
  priority: 'medium',
  title: 'Test task',
  rationale: 'Testing',
  payload: {},
  estimatedImpact: 50,
  requiresApproval: false,
  ...overrides,
});

const emptyContext: UnifiedContext = {
  snapshotAt: new Date().toISOString(),
  notion: { pages: [], databaseIds: [], recentEdits: [] },
  github: { issues: [], prs: [], commits: [] },
  derived: {
    staleTasks: [],
    unlinkedIssues: [],
    blockedItems: [],
    overdueTasks: [],
    velocity: 5,
    healthScore: 80,
    syncGapCount: 0,
  },
};

test('critical tasks rank above low tasks', async () => {
  const prioritizer = new PrioritizerAgent();
  const tasks: AgentTask[] = [
    makeTask({ priority: 'low', estimatedImpact: 90 }),
    makeTask({ priority: 'critical', estimatedImpact: 10 }),
  ];
  const ranked = await prioritizer.rank(tasks, emptyContext);
  expect(ranked[0].priority).toBe('critical');
});

test('sync tasks get bonus score', async () => {
  const prioritizer = new PrioritizerAgent();
  const tasks: AgentTask[] = [
    makeTask({ type: 'update_notion_status', priority: 'medium', estimatedImpact: 50 }),
    makeTask({ type: 'sync_status', priority: 'medium', estimatedImpact: 50 }),
  ];
  const ranked = await prioritizer.rank(tasks, emptyContext);
  expect(ranked[0].type).toBe('sync_status');
});

test('preserves all tasks in output', async () => {
  const prioritizer = new PrioritizerAgent();
  const tasks = Array.from({ length: 15 }, (_, i) =>
    makeTask({ priority: i % 2 === 0 ? 'high' : 'low' }),
  );
  const ranked = await prioritizer.rank(tasks, emptyContext);
  expect(ranked).toHaveLength(15);
});
