// BaseAgent — Abstract base class for all NAOS agents
// Provides memory access, structured logging, timing, and reflection

export class BaseAgent {
  constructor(name, { memory, eventBus, logger }) {
    this.name = name;
    this.memory = memory;
    this.eventBus = eventBus;
    this.logger = logger;

    this.state = {
      status: 'idle',        // idle | executing | reflecting | error
      lastAction: null,
      lastResult: null,
      lastExecutedAt: null,
      totalExecutions: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      avgExecutionMs: 0,
      executionTimes: [],
    };
  }

  // Main execution entry point — wraps child _execute with timing, logging, events
  async execute(context) {
    const start = Date.now();
    this.state.status = 'executing';
    this.state.lastExecutedAt = Date.now();
    this.state.totalExecutions++;

    this.logger.info(`[${this.name}] Executing: ${context.type || 'unknown'}`);
    this.eventBus.emit('agent:executing', { agent: this.name, context });

    try {
      // Retrieve relevant memories before execution
      const memories = context.memories || this.memory.getRelevantMemories({ agent: this.name });

      // Call the child implementation
      const result = await this._execute(context, memories);

      const elapsed = Date.now() - start;
      this._trackTiming(elapsed);

      this.state.status = 'idle';
      this.state.lastAction = context.type;
      this.state.lastResult = result.outcome;

      if (result.outcome === 'success') {
        this.state.totalSuccesses++;
      } else if (result.outcome === 'failure') {
        this.state.totalFailures++;
      }

      const agentResult = {
        agent: this.name,
        action: context.type || 'unknown',
        outcome: result.outcome || 'success',
        data: result.data || {},
        score: result.score || 5,
        reasoning: result.reasoning || '',
        durationMs: elapsed,
      };

      this.logger.info(`[${this.name}] Completed: ${agentResult.outcome} (${elapsed}ms)`);
      this.eventBus.emit('agent:completed', agentResult);

      // Store result in short-term memory
      this.memory.storeShortTerm(
        `agent:${this.name}:lastResult`,
        agentResult,
        { source: this.name, ttl: 5 * 60 * 1000 }
      );

      return agentResult;
    } catch (err) {
      const elapsed = Date.now() - start;
      this.state.status = 'error';
      this.state.totalFailures++;

      this.logger.error(`[${this.name}] Error: ${err.message}`);
      this.eventBus.emit('agent:error', { agent: this.name, error: err.message });

      // Store mistake in long-term memory
      this.memory.storeLongTerm('mistake', err.message, {
        agent: this.name,
        context: { type: context.type, iteration: context.iteration },
        severity: 'medium',
      });

      return {
        agent: this.name,
        action: context.type || 'unknown',
        outcome: 'failure',
        error: err.message,
        durationMs: elapsed,
      };
    }
  }

  // Self-reflection after action
  async reflect(result, iteration) {
    this.state.status = 'reflecting';

    const score = result.score || (result.outcome === 'success' ? 7 : 3);
    const reasoning = await this._generateReflection(result);

    this.memory.storeReflection(
      iteration,
      this.name,
      result.action,
      result.outcome,
      reasoning,
      score,
      [result.action, result.outcome]
    );

    this.state.status = 'idle';
    this.eventBus.emit('agent:reflected', {
      agent: this.name,
      iteration,
      score,
      reasoning,
    });
  }

  // Override in child classes
  async _execute(context, memories) {
    throw new Error(`${this.name}._execute() not implemented`);
  }

  // Override for custom reflection logic
  async _generateReflection(result) {
    if (result.outcome === 'success') {
      return `Action "${result.action}" completed successfully. Approach was effective.`;
    }
    return `Action "${result.action}" failed: ${result.error || 'unknown reason'}. Need to adjust strategy.`;
  }

  _trackTiming(elapsed) {
    this.state.executionTimes.push(elapsed);
    if (this.state.executionTimes.length > 20) this.state.executionTimes.shift();
    this.state.avgExecutionMs = this.state.executionTimes.reduce((a, b) => a + b, 0) / this.state.executionTimes.length;
  }

  getState() {
    return {
      name: this.name,
      ...this.state,
      executionTimes: undefined, // Don't expose raw array
    };
  }
}
