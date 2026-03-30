// ProductStrategist — Optimizes for user impact and demo quality
// Prioritizes tasks and generates strategic summaries

import { BaseAgent } from './BaseAgent.js';

export class ProductStrategist extends BaseAgent {
  constructor(deps) {
    super('strategist', deps);
    this.taskPriorities = new Map();
  }

  async _execute(context, memories) {
    const { type } = context;

    switch (type) {
      case 'prioritize': return this._prioritizeTasks(context, memories);
      case 'summarize': return this._generateSummary(context, memories);
      case 'demo_optimize': return this._optimizeForDemo(context, memories);
      default: return this._prioritizeTasks(context, memories);
    }
  }

  async _prioritizeTasks(context, memories) {
    const analysis = context.analysis || {};
    const tasks = [];

    // Always include sync as a core task
    tasks.push({
      id: 'sync',
      name: 'Notion ↔ GitHub Sync',
      priority: 8,
      reason: 'Core functionality — keeps systems in alignment',
    });

    // If security risks detected, prioritize security
    const securityRisks = analysis.security?.data?.totalRisks || 0;
    if (securityRisks > 0) {
      tasks.push({
        id: 'security_fix',
        name: 'Address Security Risks',
        priority: 9,
        reason: `${securityRisks} security risks detected`,
      });
    }

    // If performance is degraded, add optimization
    const healthScore = analysis.architecture?.data?.health?.overallScore || 7;
    if (healthScore < 6) {
      tasks.push({
        id: 'optimize',
        name: 'Performance Optimization',
        priority: 7,
        reason: `System health score ${healthScore.toFixed(1)}/10 — needs optimization`,
      });
    }

    // Sort by priority descending
    tasks.sort((a, b) => b.priority - a.priority);

    // Learn from past: if certain tasks always fail, deprioritize
    const failurePatterns = memories.longTerm?.failurePatterns || [];
    for (const task of tasks) {
      const failures = failurePatterns.filter(f => f.action === task.id);
      if (failures.length > 3) {
        task.priority = Math.max(1, task.priority - 2);
        task.reason += ` (deprioritized — ${failures.length} past failures)`;
      }
    }

    return {
      outcome: 'success',
      score: 7,
      data: {
        tasks: tasks.map(t => t.id),
        priorities: tasks,
        priority: tasks.length > 0 ? (tasks[0].priority >= 8 ? 'high' : 'normal') : 'low',
      },
      reasoning: `Prioritized ${tasks.length} tasks. Top priority: ${tasks[0]?.name || 'none'}.`,
    };
  }

  async _generateSummary(context, memories) {
    const reflections = this.memory.getReflections({ limit: 20 });
    const trend = this.memory.getEvolutionTrend();

    const summary = {
      totalIterations: trend.length,
      avgImprovement: trend.reduce((sum, t) => sum + (t.avg_delta || 0), 0) / Math.max(1, trend.length),
      topPerformingAgent: this._findTopAgent(reflections),
      bottomPerformingAgent: this._findBottomAgent(reflections),
      keyInsights: this._generateInsights(reflections, trend),
    };

    return {
      outcome: 'success',
      score: 8,
      data: summary,
      reasoning: `Generated strategic summary across ${summary.totalIterations} iterations.`,
    };
  }

  async _optimizeForDemo(context, memories) {
    const demoFlow = [
      { step: 1, name: 'Show Initial State', duration: '30s', focus: 'Messy workspace visualization' },
      { step: 2, name: 'Activate NAOS', duration: '30s', focus: 'Real-time agent activation' },
      { step: 3, name: 'Autonomous Sync', duration: '45s', focus: 'Live Notion ↔ GitHub sync' },
      { step: 4, name: 'Self-Learning', duration: '45s', focus: 'Memory explorer & reflections' },
      { step: 5, name: 'Evolution Display', duration: '30s', focus: 'Improvement metrics over time' },
    ];

    return {
      outcome: 'success',
      score: 9,
      data: { demoFlow, estimatedDuration: '3 minutes' },
      reasoning: 'Demo flow optimized for maximum impact — 5-step narrative.',
    };
  }

  _findTopAgent(reflections) {
    const scores = {};
    const counts = {};
    for (const r of reflections) {
      scores[r.agent] = (scores[r.agent] || 0) + r.score;
      counts[r.agent] = (counts[r.agent] || 0) + 1;
    }
    let top = null;
    let topAvg = 0;
    for (const [agent, total] of Object.entries(scores)) {
      const avg = total / counts[agent];
      if (avg > topAvg) {
        topAvg = avg;
        top = agent;
      }
    }
    return top ? { name: top, avgScore: topAvg } : null;
  }

  _findBottomAgent(reflections) {
    const scores = {};
    const counts = {};
    for (const r of reflections) {
      scores[r.agent] = (scores[r.agent] || 0) + r.score;
      counts[r.agent] = (counts[r.agent] || 0) + 1;
    }
    let bottom = null;
    let bottomAvg = Infinity;
    for (const [agent, total] of Object.entries(scores)) {
      const avg = total / counts[agent];
      if (avg < bottomAvg) {
        bottomAvg = avg;
        bottom = agent;
      }
    }
    return bottom ? { name: bottom, avgScore: bottomAvg } : null;
  }

  _generateInsights(reflections, trend) {
    const insights = [];
    if (trend.length > 2) {
      const recentDelta = trend.slice(-3).reduce((sum, t) => sum + (t.avg_delta || 0), 0) / 3;
      if (recentDelta > 0) {
        insights.push('System is on an improving trajectory — positive trend in recent iterations.');
      } else if (recentDelta < -0.1) {
        insights.push('Warning: System quality is declining — investigate recent changes.');
      }
    }
    if (reflections.filter(r => r.outcome === 'failure').length > reflections.length * 0.3) {
      insights.push('High failure rate detected — consider simplifying agent tasks.');
    }
    return insights;
  }
}
