// MemoryManager — Unified memory coordinator (async-aware for sql.js)

import { ShortTermMemory } from './ShortTermMemory.js';
import { LongTermMemory } from './LongTermMemory.js';
import { ReflectionMemory } from './ReflectionMemory.js';

export class MemoryManager {
  constructor(config = {}) {
    this.shortTerm = new ShortTermMemory();
    this.longTerm = new LongTermMemory(config.longTermDbPath || 'data/long_term.db');
    this.reflection = new ReflectionMemory(config.reflectionDbPath || 'data/reflection.db');
  }

  async waitForReady() {
    await this.longTerm.ready;
    await this.reflection.ready;
  }

  // --- Short-Term ---
  storeShortTerm(key, data, options = {}) {
    return this.shortTerm.store_entry(key, data, options);
  }
  getShortTerm(key) { return this.shortTerm.get(key); }
  queryShortTerm(filter = {}) { return this.shortTerm.query(filter); }

  // --- Long-Term ---
  storeLongTerm(category, data, metadata = {}) {
    switch (category) {
      case 'architecture': return this.longTerm.storeArchitecture(data, metadata.score, metadata.tags);
      case 'mistake': return this.longTerm.storeMistake(metadata.agent, data, metadata.context, metadata.severity);
      case 'improvement': return this.longTerm.storeImprovement(metadata.area, data.before, data.after, metadata.impactScore, metadata.iteration);
      case 'pattern': return this.longTerm.storePattern(metadata.patternCategory || 'general', data);
      default: return this.longTerm.storePattern(category, data);
    }
  }

  queryLongTerm(category, filter = {}) {
    switch (category) {
      case 'architecture': return this.longTerm.getArchitectures(filter.limit);
      case 'mistake': return this.longTerm.getMistakes(filter);
      case 'improvement': return this.longTerm.getImprovements(filter);
      case 'pattern': return this.longTerm.getPatterns(filter);
      default: return [];
    }
  }

  // --- Reflection ---
  storeReflection(iteration, agent, action, outcome, reasoning = '', score = 0, tags = []) {
    return this.reflection.storeReflection(iteration, agent, action, outcome, reasoning, score, tags);
  }
  logEvolution(iteration, phase, changesMade, metricsBefore = {}, metricsAfter = {}) {
    return this.reflection.logEvolution(iteration, phase, changesMade, metricsBefore, metricsAfter);
  }
  getReflections(filter = {}) { return this.reflection.getReflections(filter); }
  getEvolutionLog(limit = 50) { return this.reflection.getEvolutionLog(limit); }
  getEvolutionTrend() { return this.reflection.getEvolutionTrend(); }
  getAgentSummary(agent) { return this.reflection.getAgentReflectionSummary(agent); }

  // --- Context-Aware Retrieval ---
  getRelevantMemories(context = {}) {
    const memories = { shortTerm: [], longTerm: {}, reflections: [] };
    if (context.agent) {
      memories.shortTerm = this.shortTerm.query({ source: context.agent });
      memories.longTerm.mistakes = this.longTerm.getMistakes({ agent: context.agent, limit: 5 });
      memories.longTerm.successPatterns = this.reflection.getSuccessPatterns(context.agent, 5);
      memories.longTerm.failurePatterns = this.reflection.getFailurePatterns(context.agent, 5);
    }
    memories.longTerm.latestArchitecture = this.longTerm.getLatestArchitecture();
    memories.reflections = this.reflection.getReflections({ agent: context.agent, limit: 10 });
    return memories;
  }

  getSystemStats() {
    return {
      shortTerm: this.shortTerm.getStats(),
      longTerm: this.longTerm.getStats(),
      reflection: this.reflection.getStats(),
    };
  }

  getSnapshot() {
    return {
      shortTerm: this.shortTerm.getAll(),
      longTerm: {
        counts: this.longTerm.getAllCounts(),
        latestArchitecture: this.longTerm.getLatestArchitecture(),
        recentMistakes: this.longTerm.getMistakes({ limit: 5 }),
        recentImprovements: this.longTerm.getImprovements({ limit: 5 }),
        topPatterns: this.longTerm.getPatterns({ limit: 5 }),
        architectures: this.longTerm.getArchitectures(5),
      },
      reflection: {
        recentReflections: this.reflection.getReflections({ limit: 10 }),
        evolutionTrend: this.reflection.getEvolutionTrend(),
        recentEvolution: this.reflection.getEvolutionLog(5),
      },
    };
  }

  destroy() {
    this.shortTerm.destroy();
    this.longTerm.destroy();
    this.reflection.destroy();
  }
}
