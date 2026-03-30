// EvolutionEngine — Self-improvement engine
// Compares metrics, detects regressions, adjusts agent parameters

export class EvolutionEngine {
  constructor(memory, eventBus) {
    this.memory = memory;
    this.eventBus = eventBus;
    this.currentIteration = 0;
    this.baselineMetrics = null;
    this.agentConfigs = new Map();
  }

  setIteration(iteration) {
    this.currentIteration = iteration;
  }

  // Collect current metrics from agents
  collectMetrics(agents) {
    const metrics = {};
    for (const [name, agent] of Object.entries(agents)) {
      const summary = this.memory.getAgentSummary(name);
      metrics[name] = {
        totalActions: summary?.total || 0,
        avgScore: summary?.avg_score || 0,
        successRate: summary?.total > 0 ? (summary.successes / summary.total) * 100 : 0,
        failures: summary?.failures || 0,
      };
    }

    // System-wide metrics
    const systemStats = this.memory.getSystemStats();
    metrics._system = {
      shortTermSize: systemStats.shortTerm.size,
      longTermMistakes: systemStats.longTerm.counts?.mistakes || 0,
      longTermImprovements: systemStats.longTerm.counts?.improvements || 0,
      reflectionCount: systemStats.reflection.reflectionCount || 0,
    };

    return metrics;
  }

  // Evaluate if the system is improving or stagnating
  evaluate(currentMetrics) {
    const evaluation = {
      improving: false,
      stagnating: false,
      regressing: false,
      details: [],
    };

    if (!this.baselineMetrics) {
      this.baselineMetrics = currentMetrics;
      evaluation.details.push('Baseline established — first iteration');
      return evaluation;
    }

    let improvementCount = 0;
    let regressionCount = 0;

    for (const [agent, metrics] of Object.entries(currentMetrics)) {
      if (agent === '_system') continue;
      const baseline = this.baselineMetrics[agent];
      if (!baseline) continue;

      if (metrics.avgScore > (baseline.avgScore || 0)) {
        improvementCount++;
        evaluation.details.push(`${agent}: score improved ${baseline.avgScore?.toFixed(2)} → ${metrics.avgScore?.toFixed(2)}`);
      } else if (metrics.failures > (baseline.failures || 0) + 2) {
        regressionCount++;
        evaluation.details.push(`${agent}: failure count increased ${baseline.failures} → ${metrics.failures}`);
      }
    }

    evaluation.improving = improvementCount > regressionCount;
    evaluation.regressing = regressionCount > improvementCount;
    evaluation.stagnating = improvementCount === 0 && regressionCount === 0;

    return evaluation;
  }

  // Generate improvement suggestions
  generateSuggestions(evaluation, agents) {
    const suggestions = [];

    if (evaluation.regressing) {
      // Check past mistakes for patterns
      const recentMistakes = this.memory.queryLongTerm('mistake', { limit: 10 });
      const agentMistakeCounts = {};
      for (const m of recentMistakes) {
        agentMistakeCounts[m.agent] = (agentMistakeCounts[m.agent] || 0) + 1;
      }

      for (const [agent, count] of Object.entries(agentMistakeCounts)) {
        if (count >= 3) {
          suggestions.push({
            agent,
            type: 'reduce_scope',
            reason: `Agent "${agent}" has ${count} recent mistakes — reduce scope or add guards`,
          });
        }
      }
    }

    if (evaluation.stagnating) {
      suggestions.push({
        agent: '_system',
        type: 'increase_exploration',
        reason: 'System is stagnating — try new strategies or expand agent scope',
      });
    }

    return suggestions;
  }

  // Run a full evolution cycle
  async evolve(agents) {
    const metricsBefore = this.collectMetrics(agents);
    const evaluation = this.evaluate(metricsBefore);
    const suggestions = this.generateSuggestions(evaluation, agents);

    // Log the evolution step
    const result = this.memory.logEvolution(
      this.currentIteration,
      evaluation.improving ? 'improving' : evaluation.regressing ? 'regressing' : 'stable',
      {
        evaluation,
        suggestions,
        appliedChanges: [],
      },
      this.baselineMetrics?._system || {},
      metricsBefore._system || {}
    );

    // Update baseline
    this.baselineMetrics = metricsBefore;

    this.eventBus.emit('evolution:complete', {
      iteration: this.currentIteration,
      evaluation,
      suggestions,
      delta: result.delta,
    });

    return { evaluation, suggestions, delta: result.delta };
  }
}
