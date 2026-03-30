// ArchitectAgent — Analyzes system structure and proposes improvements
// Uses past architecture memory to avoid repeated design mistakes

import { BaseAgent } from './BaseAgent.js';

export class ArchitectAgent extends BaseAgent {
  constructor(deps) {
    super('architect', deps);
    this.systemHealthHistory = [];
  }

  async _execute(context, memories) {
    const { type } = context;

    switch (type) {
      case 'analyze': return this._analyzeSystem(context, memories);
      case 'propose': return this._proposeImprovement(context, memories);
      default: return this._analyzeSystem(context, memories);
    }
  }

  async _analyzeSystem(context, memories) {
    const health = {
      memoryUtilization: this._assessMemoryHealth(context.context?.memoryStats),
      agentCoverage: this._assessAgentCoverage(context.context?.agentStates),
      integrationHealth: this._assessIntegrationHealth(context.context?.syncStatus),
      overallScore: 0,
    };

    health.overallScore = (
      health.memoryUtilization.score +
      health.agentCoverage.score +
      health.integrationHealth.score
    ) / 3;

    this.systemHealthHistory.push({
      iteration: context.context?.iteration,
      score: health.overallScore,
      timestamp: Date.now(),
    });

    // Check past architectures for improvements
    const pastArchitectures = memories.longTerm?.latestArchitecture;
    let recommendation = 'System is operating within normal parameters.';

    if (health.overallScore < 5) {
      recommendation = 'System health is degraded. Recommend investigation of failing components.';
    } else if (health.overallScore > 8) {
      recommendation = 'System is performing excellently. Consider expanding scope.';
    }

    // Store architecture snapshot
    this.memory.storeLongTerm('architecture', {
      health,
      recommendation,
      agentCount: Object.keys(context.context?.agentStates || {}).length,
    }, { score: health.overallScore, tags: ['health-check'] });

    return {
      outcome: 'success',
      score: Math.round(health.overallScore),
      data: { health, recommendation },
      reasoning: `System health score: ${health.overallScore.toFixed(1)}/10. ${recommendation}`,
    };
  }

  async _proposeImprovement(context, memories) {
    const failurePatterns = memories.longTerm?.failurePatterns || [];
    const proposals = [];

    if (failurePatterns.length > 3) {
      proposals.push({
        area: 'error_handling',
        suggestion: 'Implement circuit-breaker pattern for frequently failing operations',
        priority: 'high',
      });
    }

    return {
      outcome: 'success',
      score: 7,
      data: { proposals },
      reasoning: `Generated ${proposals.length} improvement proposals based on ${failurePatterns.length} failure patterns.`,
    };
  }

  _assessMemoryHealth(stats) {
    if (!stats) return { score: 5, details: 'No stats available' };
    const stSize = stats.shortTerm?.size || 0;
    const ltWrites = stats.longTerm?.writes || 0;
    const score = Math.min(10, 5 + (ltWrites > 0 ? 2 : 0) + (stSize > 0 ? 2 : 0) + (stSize < 500 ? 1 : 0));
    return { score, details: `ST: ${stSize} entries, LT: ${ltWrites} writes` };
  }

  _assessAgentCoverage(agentStates) {
    if (!agentStates) return { score: 5, details: 'No agent states' };
    const total = Object.keys(agentStates).length;
    const active = Object.values(agentStates).filter(s => s.totalExecutions > 0).length;
    const score = total > 0 ? (active / total) * 10 : 5;
    return { score: Math.min(10, score), details: `${active}/${total} agents active` };
  }

  _assessIntegrationHealth(syncStatus) {
    if (!syncStatus) return { score: 5, details: 'No sync data' };
    const { synced = 0, pending = 0, errors = 0 } = syncStatus;
    const total = synced + pending + errors;
    const score = total > 0 ? ((synced / total) * 10) : 7;
    return { score: Math.min(10, score), details: `${synced} synced, ${pending} pending, ${errors} errors` };
  }

  async _generateReflection(result) {
    const score = result.data?.health?.overallScore || 0;
    if (score >= 7) return `System health analysis complete. Score ${score.toFixed(1)}/10 — healthy state.`;
    if (score >= 4) return `System health analysis complete. Score ${score.toFixed(1)}/10 — moderate, needs attention.`;
    return `System health analysis complete. Score ${score.toFixed(1)}/10 — critical, immediate action needed.`;
  }
}
