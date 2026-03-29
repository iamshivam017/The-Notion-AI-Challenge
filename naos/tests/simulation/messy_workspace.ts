/**
 * Simulation: messy workspace
 *
 * Runs NAOS against a synthetic messy Notion + GitHub workspace
 * to validate task generation, prioritization, and execution flow.
 *
 * Usage: DRY_RUN=true ts-node tests/simulation/messy_workspace.ts
 */

import { buildContext } from '../../src/context/builder';
import { OrchestratorAgent } from '../../src/agents/orchestrator';
import type { NotionPage } from '../../src/integrations/notion/sync';
import type { GitHubData } from '../../src/integrations/github/sync';

// ---------------------------------------------------------------------------
// Synthetic workspace data
// ---------------------------------------------------------------------------
const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

const MOCK_NOTION_PAGES: NotionPage[] = [
  // Active tasks
  { id: 'page-001', title: 'Redesign onboarding flow', status: 'In Progress', priority: 'High', lastEdited: daysAgo(1), created: daysAgo(14), databaseId: 'db-001', url: 'https://notion.so/page-001', properties: {} },
  { id: 'page-002', title: 'Fix login redirect bug', status: 'In Progress', priority: 'Critical', lastEdited: daysAgo(2), created: daysAgo(7), databaseId: 'db-001', url: 'https://notion.so/page-002', githubIssueUrl: 'https://github.com/acme/api/issues/42', properties: {} },

  // Stale tasks — last edited >7 days ago
  { id: 'page-003', title: 'Update API documentation', status: 'In Progress', lastEdited: daysAgo(15), created: daysAgo(30), databaseId: 'db-001', url: 'https://notion.so/page-003', properties: {} },
  { id: 'page-004', title: 'Migrate legacy database tables', status: 'Todo', lastEdited: daysAgo(21), created: daysAgo(45), databaseId: 'db-001', url: 'https://notion.so/page-004', properties: {} },
  { id: 'page-005', title: 'Set up error monitoring', status: 'Todo', lastEdited: daysAgo(30), created: daysAgo(60), databaseId: 'db-001', url: 'https://notion.so/page-005', properties: {} },
  { id: 'page-006', title: 'Write unit tests for payment service', status: 'In Progress', lastEdited: daysAgo(12), created: daysAgo(20), databaseId: 'db-001', url: 'https://notion.so/page-006', properties: {} },
  { id: 'page-007', title: 'Draft Q3 roadmap', status: 'Todo', lastEdited: daysAgo(10), created: daysAgo(10), databaseId: 'db-001', url: 'https://notion.so/page-007', properties: {} },

  // Blocked items
  { id: 'page-008', title: 'Deploy new infrastructure', status: 'Blocked', lastEdited: daysAgo(5), created: daysAgo(14), databaseId: 'db-001', url: 'https://notion.so/page-008', properties: {} },
  { id: 'page-009', title: 'Launch mobile app', status: 'Blocked', lastEdited: daysAgo(3), created: daysAgo(30), databaseId: 'db-001', url: 'https://notion.so/page-009', properties: {} },

  // Overdue (dueDate in the past, not Done)
  { id: 'page-010', title: 'Security audit report', status: 'In Progress', dueDate: daysAgo(5), lastEdited: daysAgo(8), created: daysAgo(20), databaseId: 'db-001', url: 'https://notion.so/page-010', properties: {} },
  { id: 'page-011', title: 'Customer onboarding checklist', status: 'Todo', dueDate: daysAgo(2), lastEdited: daysAgo(14), created: daysAgo(25), databaseId: 'db-001', url: 'https://notion.so/page-011', properties: {} },

  // Completed tasks (should not generate actions)
  { id: 'page-012', title: 'Ship v2.0 release', status: 'Done', lastEdited: daysAgo(1), created: daysAgo(60), databaseId: 'db-001', url: 'https://notion.so/page-012', properties: {} },
  { id: 'page-013', title: 'Hire senior engineer', status: 'Done', lastEdited: daysAgo(3), created: daysAgo(90), databaseId: 'db-001', url: 'https://notion.so/page-013', properties: {} },
];

const MOCK_GITHUB_DATA: GitHubData = {
  issues: [
    // Linked to Notion
    { number: 42, title: 'Login redirect fails on mobile', state: 'open', labels: ['bug', 'mobile'], assignee: 'alice', createdAt: daysAgo(7), updatedAt: daysAgo(2), url: 'https://github.com/acme/api/issues/42' },

    // Unlinked — no Notion task
    { number: 55, title: 'Add rate limiting to /search endpoint', state: 'open', labels: ['enhancement', 'backend'], createdAt: daysAgo(5), updatedAt: daysAgo(5), url: 'https://github.com/acme/api/issues/55' },
    { number: 56, title: 'Flaky test in CI: auth.spec.ts', state: 'open', labels: ['bug', 'ci'], createdAt: daysAgo(3), updatedAt: daysAgo(3), url: 'https://github.com/acme/api/issues/56' },
    { number: 57, title: 'Upgrade React to v19', state: 'open', labels: ['dependencies'], createdAt: daysAgo(10), updatedAt: daysAgo(10), url: 'https://github.com/acme/api/issues/57' },
    { number: 58, title: 'Memory leak in WebSocket handler', state: 'open', labels: ['bug', 'critical'], createdAt: daysAgo(1), updatedAt: daysAgo(1), url: 'https://github.com/acme/api/issues/58' },
    { number: 60, title: 'Add dark mode support', state: 'open', labels: ['feature'], createdAt: daysAgo(14), updatedAt: daysAgo(14), url: 'https://github.com/acme/api/issues/60' },
  ],
  prs: [
    { number: 101, title: 'feat: add OAuth2 support', state: 'open', draft: false, reviewCount: 0, createdAt: daysAgo(4), updatedAt: daysAgo(4), url: 'https://github.com/acme/api/pulls/101', headRef: 'feat/oauth2' },
    { number: 102, title: 'fix: resolve payment race condition', state: 'open', draft: false, reviewCount: 1, createdAt: daysAgo(2), updatedAt: daysAgo(1), url: 'https://github.com/acme/api/pulls/102', headRef: 'fix/payment-race' },
    { number: 103, title: 'WIP: experiment with new cache layer', state: 'open', draft: true, reviewCount: 0, createdAt: daysAgo(7), updatedAt: daysAgo(7), url: 'https://github.com/acme/api/pulls/103', headRef: 'wip/cache' },
  ],
  commits: [
    { sha: 'abc1234', message: 'fix: mobile login redirect', author: 'alice', timestamp: daysAgo(2), url: 'https://github.com/acme/api/commit/abc1234' },
    { sha: 'def5678', message: 'chore: update dependencies', author: 'bob', timestamp: daysAgo(3), url: 'https://github.com/acme/api/commit/def5678' },
  ],
};

// ---------------------------------------------------------------------------
// Run simulation
// ---------------------------------------------------------------------------
async function runSimulation() {
  console.log('🧪 NAOS Simulation — Messy Workspace\n');
  console.log('Workspace characteristics:');
  console.log(`  • ${MOCK_NOTION_PAGES.length} Notion pages`);
  console.log(`  • ${MOCK_NOTION_PAGES.filter(p => p.status !== 'Done').filter(p => new Date(p.lastEdited) < new Date(Date.now() - 7 * 86_400_000)).length} stale tasks`);
  console.log(`  • ${MOCK_NOTION_PAGES.filter(p => p.status === 'Blocked').length} blocked items`);
  console.log(`  • ${MOCK_GITHUB_DATA.issues.length} open GitHub issues`);
  console.log(`  • ${MOCK_GITHUB_DATA.prs.length} open PRs`);

  // Set required env vars for simulation
  process.env.NOTION_API_KEY = 'secret_simulation_key_placeholder';
  process.env.NOTION_WORKSPACE_ID = 'db-001';
  process.env.NOTION_DATABASE_IDS = 'db-001';
  process.env.GITHUB_TOKEN = 'ghp_simulation_placeholder';
  process.env.GITHUB_OWNER = 'acme';
  process.env.GITHUB_REPO = 'api';
  process.env.GITHUB_WEBHOOK_SECRET = 'simulation_webhook_secret_32chars_min';
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? 'sk-ant-placeholder';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.DRY_RUN = 'true';
  process.env.REQUIRE_HUMAN_APPROVAL = 'false';
  process.env.MAX_ACTIONS_PER_RUN = '10';

  const context = await buildContext(MOCK_NOTION_PAGES, MOCK_GITHUB_DATA, true);

  console.log(`\n📊 Context built:`);
  console.log(`   Health score: ${context.derived.healthScore}/100`);
  console.log(`   Stale tasks: ${context.derived.staleTasks.length}`);
  console.log(`   Unlinked issues: ${context.derived.unlinkedIssues.length}`);
  console.log(`   Blocked items: ${context.derived.blockedItems.length}`);
  console.log(`   Overdue tasks: ${context.derived.overdueTasks.length}`);
  console.log(`   Velocity: ${context.derived.velocity} tasks/week`);

  const orchestrator = new OrchestratorAgent();
  const result = await orchestrator.run(context);

  console.log('\n📈 Simulation Results:');
  console.log(`   Tasks generated: ${result.tasksGenerated}`);
  console.log(`   Tasks passed review: ${result.tasksPassed}`);
  console.log(`   Tasks executed (dry): ${result.tasksExecuted}`);
  console.log(`   Tasks failed: ${result.tasksFailed}`);
  console.log(`\n💡 Improvements identified:`);
  result.improvements.forEach(i => console.log(`   • ${i}`));
}

runSimulation().catch(err => {
  console.error('Simulation failed:', err);
  process.exit(1);
});
