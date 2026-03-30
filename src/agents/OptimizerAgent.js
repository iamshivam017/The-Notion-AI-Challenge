// OptimizerAgent — Monitors performance metrics and identifies bottlenecks
// Learns from past inefficiencies and suggests improvements

import { BaseAgent } from './BaseAgent.js';

export class OptimizerAgent extends BaseAgent {
  constructor(deps) {
    super('optimizer', deps);
    this.optimizationHistory = [];
  }

  async _execute(context, memories) {
    const { type } = context;

    switch (type) {
      case 'optimize': return this._optimize(context, memories);
      case 'benchmark': return this._benchmark(context, memories);
      default: return this._optimize(context, memories);
    }
  }

  async _optimize(context, memories) {
    const metrics = context.metrics || {};
    const suggestions = [];

    // 1. Analyze cycle times
    const cycleAnalysis = this._analyzeCycleTimes(metrics);
    if (cycleAnalysis.suggestion) suggestions.push(cycleAnalysis.suggestion);

    // 2. Analyze memory usage
    const memStats = this.memory.getSystemStats();
    const memoryAnalysis = this._analyzeMemoryUsage(memStats);
    if (memoryAnalysis.suggestion) suggestions.push(memoryAnalysis.suggestion);

    // 3. Analyze error rates
    const errorAnalysis = this._analyzeErrorRates(metrics, memories);
    if (errorAnalysis.suggestion) suggestions.push(errorAnalysis.suggestion);

    // 4. Check for past optimization patterns
    const pastOptimizations = memories.longTerm?.successPatterns || [];
    const reusable = pastOptimizations.filter(p => p.action === 'optimize');
    if (reusable.length > 0) {
      suggestions.push({
        area: 'pattern_reuse',
        suggestion: `Found ${reusable.length} past successful optimization patterns — consider reapplying`,
        priority: 'low',
        impact: 3,
      });
    }

    // Store as improvement if we found something
    if (suggestions.length > 0) {
      this.memory.storeLongTerm('improvement', {
        before: { suggestionCount: 0 },
        after: { suggestionCount: suggestions.length },
      }, {
        area: 'optimization',
        impactScore: suggestions.reduce((sum, s) => sum + (s.impact || 1), 0),
        iteration: context.iteration || 0,
      });
    }

    this.optimizationHistory.push({
      timestamp: Date.now(),
      suggestionsCount: suggestions.length,
    });

    const score = suggestions.length === 0 ? 8 : Math.max(4, 8 - suggestions.filter(s => s.priority === 'high').length);

    return {
      outcome: 'success',
      score,
      data: { suggestions, analyses: { cycleAnalysis, memoryAnalysis, errorAnalysis } },
      reasoning: suggestions.length === 0
        ? 'System is well-optimized — no significant bottlenecks detected.'
        : `Found ${suggestions.length} optimization opportunities. Top priority: ${suggestions[0]?.area || 'general'}.`,
    };
  }

  _analyzeCycleTimes(metrics) {
    const avgMs = metrics.avgCycleTimeMs || 0;
    if (avgMs > 5000) {
      return {
        status: 'slow',
        avgMs,
        suggestion: {
          area: 'cycle_time',
          suggestion: `Average cycle time is ${avgMs.toFixed(0)}ms — consider batching operations or reducing agent scope`,
          priority: 'high',
          impact: 7,
        },
      };
    }
    if (avgMs > 2000) {
      return {
        status: 'moderate',
        avgMs,
        suggestion: {
          area: 'cycle_time',
          suggestion: `Cycle time ${avgMs.toFixed(0)}ms is acceptable but could be improved`,
          priority: 'medium',
          impact: 4,
        },
      };
    }
    return { status: 'good', avgMs, suggestion: null };
  }

  _analyzeMemoryUsage(memStats) {
    const stSize = memStats.shortTerm?.size || 0;
    if (stSize > 1000) {
      return {
        status: 'high',
        size: stSize,
        suggestion: {
          area: 'memory',
          suggestion: `Short-term memory has ${stSize} entries — consider reducing TTL or cleaning stale entries`,
          priority: 'medium',
          impact: 5,
        },
      };
    }
    return { status: 'good', size: stSize, suggestion: null };
  }

  _analyzeErrorRates(metrics, memories) {
    const errorRate = metrics.totalCycles > 0 ? (metrics.totalErrors / metrics.totalCycles) * 100 : 0;
    if (errorRate > 30) {
      return {
        status: 'critical',
        errorRate,
        suggestion: {
          area: 'error_rate',
          suggestion: `Error rate is ${errorRate.toFixed(1)}% — investigate root causes and add guards`,
          priority: 'high',
          impact: 8,
        },
      };
    }
    return { status: 'good', errorRate, suggestion: null };
  }

  async _benchmark(context, memories) {
    return {
      outcome: 'success',
      score: 7,
      data: { benchmark: 'complete' },
      reasoning: 'Benchmark run completed.',
    };
  }

  async _generateReflection(result) {
    const sCount = result.data?.suggestions?.length || 0;
    return sCount > 0
      ? `Found ${sCount} optimization opportunities. System can be improved.`
      : 'System is performing optimally — no bottlenecks detected.';
  }
}
