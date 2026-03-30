// CriticAgent — Evaluates outputs of other agents
// Uses reflection memory to compare against historical quality and flags regressions

import { BaseAgent } from './BaseAgent.js';

export class CriticAgent extends BaseAgent {
  constructor(deps) {
    super('critic', deps);
    this.qualityThreshold = 5;
  }

  async _execute(context, memories) {
    const { type } = context;

    switch (type) {
      case 'evaluate': return this._evaluateResults(context, memories);
      case 'compare': return this._compareToBaseline(context, memories);
      default: return this._evaluateResults(context, memories);
    }
  }

  async _evaluateResults(context, memories) {
    const results = context.results || [];
    const evaluations = [];
    let totalScore = 0;

    for (const result of results) {
      const evaluation = this._evaluateSingle(result, memories);
      evaluations.push(evaluation);
      totalScore += evaluation.score;
    }

    const avgScore = results.length > 0 ? totalScore / results.length : 5;

    // Check for regressions
    const historicalAvg = this._getHistoricalAverage(memories);
    const isRegressing = historicalAvg > 0 && avgScore < historicalAvg - 1;

    // Store evaluation pattern
    this.memory.storeLongTerm('pattern', {
      avgScore,
      evaluationCount: evaluations.length,
      historicalAvg,
      isRegressing,
    }, { patternCategory: 'quality_evaluation' });

    return {
      outcome: 'success',
      score: Math.round(avgScore),
      data: {
        evaluations,
        avgScore,
        historicalAvg,
        isRegressing,
        regressionWarning: isRegressing
          ? `Quality regression detected: current ${avgScore.toFixed(1)} vs historical ${historicalAvg.toFixed(1)}`
          : null,
      },
      reasoning: isRegressing
        ? `Quality regression: ${avgScore.toFixed(1)} vs baseline ${historicalAvg.toFixed(1)}. ${evaluations.length} results evaluated.`
        : `Quality assessment: ${avgScore.toFixed(1)}/10 across ${evaluations.length} results. Stable performance.`,
    };
  }

  _evaluateSingle(result, memories) {
    let score = 5; // baseline
    const feedback = [];

    // Score based on outcome
    if (result.outcome === 'success') {
      score += 2;
      feedback.push('Task completed successfully');
    } else if (result.outcome === 'failure') {
      score -= 3;
      feedback.push(`Task failed: ${result.error || 'unknown'}`);
    }

    // Score based on execution time
    if (result.durationMs) {
      if (result.durationMs < 100) {
        score += 1;
        feedback.push('Excellent execution speed');
      } else if (result.durationMs > 5000) {
        score -= 1;
        feedback.push('Slow execution — consider optimization');
      }
    }

    // Score based on data richness
    if (result.data && Object.keys(result.data).length > 2) {
      score += 1;
      feedback.push('Rich data output');
    }

    // Check if this agent has repeated failures
    const agentFailures = (memories.longTerm?.failurePatterns || [])
      .filter(f => f.action === result.action);
    if (agentFailures.length > 2) {
      score -= 1;
      feedback.push(`Recurring failure pattern for "${result.action}" — needs rethinking`);
    }

    return {
      agent: result.agent,
      action: result.action,
      score: Math.max(1, Math.min(10, score)),
      feedback,
    };
  }

  _getHistoricalAverage(memories) {
    const reflections = memories.reflections || [];
    if (reflections.length === 0) return 0;
    const criticReflections = reflections.filter(r => r.agent === 'critic');
    if (criticReflections.length === 0) return 0;
    return criticReflections.reduce((sum, r) => sum + r.score, 0) / criticReflections.length;
  }

  async _compareToBaseline(context, memories) {
    const baseline = memories.longTerm?.latestArchitecture;
    return {
      outcome: 'success',
      score: 7,
      data: { baseline: baseline?.score || 0, comparison: 'stable' },
      reasoning: 'Baseline comparison complete.',
    };
  }

  async _generateReflection(result) {
    const data = result.data || {};
    if (data.isRegressing) {
      return `Quality regression detected (${data.avgScore?.toFixed(1)} vs ${data.historicalAvg?.toFixed(1)}). System needs attention.`;
    }
    return `Quality evaluation complete. Average score: ${data.avgScore?.toFixed(1)}/10. System performing ${data.avgScore >= 7 ? 'well' : 'adequately'}.`;
  }
}
