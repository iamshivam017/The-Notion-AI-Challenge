// DemoRunner — Orchestrates a demo scenario showing NAOS capabilities

import { MockNotionWorkspace } from './MockNotionWorkspace.js';
import { MockGitHubRepo } from './MockGitHubRepo.js';

export class DemoRunner {
  constructor({ memory, eventBus, orchestrator, logger }) {
    this.memory = memory;
    this.eventBus = eventBus;
    this.orchestrator = orchestrator;
    this.logger = logger;

    this.notionWorkspace = new MockNotionWorkspace();
    this.githubRepo = new MockGitHubRepo();
    this.demoState = 'idle';
    this.currentStep = 0;
  }

  async runFullDemo() {
    this.demoState = 'running';
    this.logger.info('=== NAOS DEMO STARTED ===');
    this.eventBus.emit('demo:started', { timestamp: Date.now() });

    try {
      // Step 1: Show the messy initial state
      await this._step1_showInitialState();

      // Step 2: Seed memory with some baseline data
      await this._step2_seedMemory();

      // Step 3: Run the orchestrator
      await this._step3_runOrchestrator();

      // Step 4: Show evolution
      await this._step4_showEvolution();

      this.demoState = 'complete';
      this.logger.info('=== NAOS DEMO COMPLETE ===');
      this.eventBus.emit('demo:completed', { timestamp: Date.now() });
    } catch (err) {
      this.demoState = 'error';
      this.logger.error(`Demo failed: ${err.message}`);
      this.eventBus.emit('demo:error', { error: err.message });
    }
  }

  async _step1_showInitialState() {
    this.currentStep = 1;
    this.eventBus.emit('demo:step', { step: 1, name: 'Initial State Analysis' });

    const notionSnapshot = this.notionWorkspace.getSnapshot();
    const githubSnapshot = this.githubRepo.getSnapshot();

    this.memory.storeShortTerm('demo:notion_snapshot', notionSnapshot, { source: 'demo' });
    this.memory.storeShortTerm('demo:github_snapshot', githubSnapshot, { source: 'demo' });

    this.eventBus.emit('demo:data', {
      step: 1,
      notion: notionSnapshot,
      github: githubSnapshot,
    });

    this.logger.info(`Demo Step 1: Notion has ${notionSnapshot.totalPages} pages (${notionSnapshot.messyPages} messy), GitHub has ${githubSnapshot.totalIssues} issues (${githubSnapshot.openIssues} open)`);
    await this._delay(500);
  }

  async _step2_seedMemory() {
    this.currentStep = 2;
    this.eventBus.emit('demo:step', { step: 2, name: 'Seeding Memory Systems' });

    // Seed some long-term patterns
    this.memory.storeLongTerm('pattern', {
      type: 'sync_success',
      conditions: ['stable_api', 'low_traffic'],
      successRate: 0.95,
    }, { patternCategory: 'sync_patterns' });

    this.memory.storeLongTerm('pattern', {
      type: 'rate_limit_avoidance',
      strategy: 'exponential_backoff',
      maxRetries: 3,
    }, { patternCategory: 'error_handling' });

    // Seed some initial architecture
    this.memory.storeLongTerm('architecture', {
      agents: ['architect', 'engineer', 'security', 'critic', 'optimizer', 'strategist'],
      memoryLayers: 3,
      syncEngine: 'bidirectional',
    }, { score: 7, tags: ['initial', 'v1'] });

    // Seed a past mistake
    this.memory.storeLongTerm('mistake', 'Sync attempted during API rate limit window', {
      agent: 'engineer',
      context: { iteration: 0, cause: 'no_rate_check' },
      severity: 'medium',
    });

    this.logger.info('Demo Step 2: Memory systems seeded with baseline data');
    this.eventBus.emit('demo:data', { step: 2, message: 'Memory seeded' });
    await this._delay(300);
  }

  async _step3_runOrchestrator() {
    this.currentStep = 3;
    this.eventBus.emit('demo:step', { step: 3, name: 'Running Orchestrator Cycles' });

    // Run 3 cycles
    for (let i = 0; i < 3; i++) {
      this.logger.info(`Demo Step 3: Running cycle ${i + 1}/3`);
      await this.orchestrator.runCycle();
      await this._delay(500);
    }
  }

  async _step4_showEvolution() {
    this.currentStep = 4;
    this.eventBus.emit('demo:step', { step: 4, name: 'Evolution Summary' });

    const trend = this.memory.getEvolutionTrend();
    const recentReflections = this.memory.getReflections({ limit: 20 });
    const systemStats = this.memory.getSystemStats();

    const summary = {
      totalIterations: trend.length,
      avgImprovement: trend.reduce((sum, t) => sum + (t.avg_delta || 0), 0) / Math.max(1, trend.length),
      totalReflections: recentReflections.length,
      memoryStats: systemStats,
    };

    this.eventBus.emit('demo:data', { step: 4, evolution: summary });
    this.logger.info(`Demo Step 4: ${summary.totalIterations} iterations, ${summary.totalReflections} reflections`);
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus() {
    return {
      state: this.demoState,
      currentStep: this.currentStep,
      notionSnapshot: this.notionWorkspace.getSnapshot(),
      githubSnapshot: this.githubRepo.getSnapshot(),
    };
  }
}
