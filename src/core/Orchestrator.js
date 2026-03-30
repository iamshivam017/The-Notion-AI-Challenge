// Orchestrator — The brain of NAOS
// Runs: OBSERVE → ANALYZE → DECIDE → ACT → REFLECT → STORE → IMPROVE

export class Orchestrator {
  constructor({ agents, memory, eventBus, evolutionEngine, syncEngine, logger }) {
    this.agents = agents;
    this.memory = memory;
    this.eventBus = eventBus;
    this.evolution = evolutionEngine;
    this.syncEngine = syncEngine;
    this.logger = logger;

    this.iteration = 0;
    this.running = false;
    this.interval = null;
    this.intervalMs = parseInt(process.env.ORCHESTRATOR_INTERVAL_MS || '10000', 10);
    this.state = 'idle'; // idle | running | paused | error
    this.currentCycleResults = [];
    this.metrics = {
      totalCycles: 0,
      totalActions: 0,
      totalErrors: 0,
      avgCycleTimeMs: 0,
      cycleTimes: [],
    };
  }

  // Start the continuous loop
  start() {
    if (this.running) return;
    this.running = true;
    this.state = 'running';
    this.logger.info('Orchestrator started');
    this.eventBus.emit('orchestrator:started', { iteration: this.iteration });

    // Run immediately, then on interval
    this.runCycle();
    this.interval = setInterval(() => this.runCycle(), this.intervalMs);
  }

  // Stop the loop
  stop() {
    this.running = false;
    this.state = 'idle';
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.logger.info('Orchestrator stopped');
    this.eventBus.emit('orchestrator:stopped', { iteration: this.iteration });
  }

  // Run a single cycle (can be called manually)
  async runCycle() {
    if (this.state === 'error') return;

    const cycleStart = Date.now();
    this.iteration++;
    this.evolution.setIteration(this.iteration);
    this.currentCycleResults = [];

    this.logger.info(`--- Cycle ${this.iteration} BEGIN ---`);
    this.eventBus.emit('cycle:start', { iteration: this.iteration });

    try {
      // 1. OBSERVE — gather current state
      const context = await this._observe();

      // 2. ANALYZE — assess the situation
      const analysis = await this._analyze(context);

      // 3. DECIDE — determine what to do
      const plan = await this._decide(analysis);

      // 4. ACT — execute the plan
      const results = await this._act(plan);

      // 5. REFLECT — evaluate outcomes
      await this._reflect(results);

      // 6. STORE — persist learnings
      await this._store(results);

      // 7. IMPROVE — run evolution
      const evolution = await this.evolution.evolve(this.agents);

      // Track metrics
      const cycleTime = Date.now() - cycleStart;
      this.metrics.totalCycles++;
      this.metrics.cycleTimes.push(cycleTime);
      if (this.metrics.cycleTimes.length > 50) this.metrics.cycleTimes.shift();
      this.metrics.avgCycleTimeMs = this.metrics.cycleTimes.reduce((a, b) => a + b, 0) / this.metrics.cycleTimes.length;

      this.eventBus.emit('cycle:complete', {
        iteration: this.iteration,
        cycleTimeMs: cycleTime,
        resultsCount: results.length,
        evolution,
      });

      this.logger.info(`--- Cycle ${this.iteration} END (${cycleTime}ms) ---`);
    } catch (err) {
      this.metrics.totalErrors++;
      this.logger.error(`Cycle ${this.iteration} failed: ${err.message}`);
      this.eventBus.emit('cycle:error', { iteration: this.iteration, error: err.message });

      // Store the mistake
      this.memory.storeLongTerm('mistake', err.message, {
        agent: 'orchestrator',
        context: { iteration: this.iteration },
        severity: 'high',
      });
    }
  }

  // --- Phase Implementations ---

  async _observe() {
    this.eventBus.emit('phase:observe', { iteration: this.iteration });

    // Gather context from all sources
    const context = {
      iteration: this.iteration,
      timestamp: Date.now(),
      syncStatus: this.syncEngine ? await this.syncEngine.getStatus() : { synced: 0, pending: 0 },
      memoryStats: this.memory.getSystemStats(),
      agentStates: {},
    };

    for (const [name, agent] of Object.entries(this.agents)) {
      context.agentStates[name] = agent.getState();
    }

    // Store in short-term memory
    this.memory.storeShortTerm(`cycle:${this.iteration}:context`, context, { source: 'orchestrator' });

    return context;
  }

  async _analyze(context) {
    this.eventBus.emit('phase:analyze', { iteration: this.iteration });

    // Run Architect Agent to analyze system state
    const architectResult = await this.agents.architect.execute({
      type: 'analyze',
      context,
      memories: this.memory.getRelevantMemories({ agent: 'architect' }),
    });

    // Run Security Agent to check for risks
    const securityResult = await this.agents.security.execute({
      type: 'scan',
      context,
      memories: this.memory.getRelevantMemories({ agent: 'security' }),
    });

    return {
      architecture: architectResult,
      security: securityResult,
      context,
    };
  }

  async _decide(analysis) {
    this.eventBus.emit('phase:decide', { iteration: this.iteration });

    // Run Product Strategist to prioritize
    const strategyResult = await this.agents.strategist.execute({
      type: 'prioritize',
      analysis,
      memories: this.memory.getRelevantMemories({ agent: 'strategist' }),
    });

    return {
      tasks: strategyResult.data?.tasks || ['sync'],
      priority: strategyResult.data?.priority || 'normal',
      strategy: strategyResult,
    };
  }

  async _act(plan) {
    this.eventBus.emit('phase:act', { iteration: this.iteration, plan });

    const results = [];

    for (const task of plan.tasks) {
      try {
        let result;
        switch (task) {
          case 'sync':
            result = await this.agents.engineer.execute({
              type: 'sync',
              memories: this.memory.getRelevantMemories({ agent: 'engineer' }),
            });
            break;
          case 'optimize':
            result = await this.agents.optimizer.execute({
              type: 'optimize',
              memories: this.memory.getRelevantMemories({ agent: 'optimizer' }),
              metrics: this.metrics,
            });
            break;
          default:
            result = { agent: 'engineer', action: task, outcome: 'skipped', data: {} };
        }
        results.push(result);
        this.metrics.totalActions++;
      } catch (err) {
        results.push({
          agent: 'unknown',
          action: task,
          outcome: 'failure',
          error: err.message,
        });
        this.metrics.totalErrors++;
      }
    }

    return results;
  }

  async _reflect(results) {
    this.eventBus.emit('phase:reflect', { iteration: this.iteration });

    // Run Critic Agent on all results
    const criticResult = await this.agents.critic.execute({
      type: 'evaluate',
      results,
      memories: this.memory.getRelevantMemories({ agent: 'critic' }),
    });

    // Each agent self-reflects
    for (const result of results) {
      const agent = this.agents[result.agent];
      if (agent && typeof agent.reflect === 'function') {
        await agent.reflect(result, this.iteration);
      }
    }

    return criticResult;
  }

  async _store(results) {
    this.eventBus.emit('phase:store', { iteration: this.iteration });

    // Store cycle results in short-term
    this.memory.storeShortTerm(`cycle:${this.iteration}:results`, results, { source: 'orchestrator' });

    // Store in long-term if significant
    for (const result of results) {
      if (result.outcome === 'failure') {
        this.memory.storeLongTerm('mistake', result.error || 'Unknown error', {
          agent: result.agent,
          context: { iteration: this.iteration, action: result.action },
          severity: 'medium',
        });
      }
      if (result.outcome === 'success' && result.data?.improvement) {
        this.memory.storeLongTerm('improvement', {
          before: result.data.improvement.before,
          after: result.data.improvement.after,
        }, {
          area: result.action,
          impactScore: result.data.improvement.impact || 0,
          iteration: this.iteration,
        });
      }
    }
  }

  // --- Public API ---

  getState() {
    return {
      state: this.state,
      iteration: this.iteration,
      running: this.running,
      metrics: { ...this.metrics, cycleTimes: undefined },
      intervalMs: this.intervalMs,
    };
  }

  getDetailedStatus() {
    return {
      ...this.getState(),
      lastCycleResults: this.currentCycleResults,
      agentStates: Object.fromEntries(
        Object.entries(this.agents).map(([name, agent]) => [name, agent.getState()])
      ),
      memoryStats: this.memory.getSystemStats(),
    };
  }
}
