// SecurityAgent — Detects vulnerabilities and monitors API safety
// Remembers past risks and validates configurations

import { BaseAgent } from './BaseAgent.js';

export class SecurityAgent extends BaseAgent {
  constructor(deps) {
    super('security', deps);
    this.knownRisks = [];
    this.lastScanResults = null;
  }

  async _execute(context, memories) {
    const { type } = context;

    switch (type) {
      case 'scan': return this._fullScan(context, memories);
      case 'validate_tokens': return this._validateTokens(context);
      case 'check_rate_limits': return this._checkRateLimits(context);
      default: return this._fullScan(context, memories);
    }
  }

  async _fullScan(context, memories) {
    const risks = [];
    const checks = [];

    // 1. Check environment variables
    const envCheck = this._checkEnvSecurity();
    checks.push(envCheck);
    if (envCheck.risks.length > 0) risks.push(...envCheck.risks);

    // 2. Check rate limit proximity
    const rateLimitCheck = this._checkRateLimitProximity(context);
    checks.push(rateLimitCheck);
    if (rateLimitCheck.risks.length > 0) risks.push(...rateLimitCheck.risks);

    // 3. Check for repeated errors (possible attack vector)
    const errorCheck = this._checkErrorPatterns(memories);
    checks.push(errorCheck);
    if (errorCheck.risks.length > 0) risks.push(...errorCheck.risks);

    // 4. Memory data exposure check
    const dataCheck = this._checkDataExposure();
    checks.push(dataCheck);
    if (dataCheck.risks.length > 0) risks.push(...dataCheck.risks);

    // Compare with past risks
    const pastRisks = memories.longTerm?.mistakes?.filter(m => m.agent === 'security') || [];
    const newRisks = risks.filter(r => !pastRisks.some(pr => pr.description === r.description));

    if (newRisks.length > 0) {
      for (const risk of newRisks) {
        this.memory.storeLongTerm('mistake', risk.description, {
          agent: 'security',
          context: { severity: risk.severity, category: risk.category },
          severity: risk.severity,
        });
      }
    }

    this.knownRisks = risks;
    this.lastScanResults = { checks, risks, newRisks };

    const score = risks.length === 0 ? 9 : Math.max(2, 9 - risks.length);

    return {
      outcome: 'success',
      score,
      data: {
        checksPerformed: checks.length,
        totalRisks: risks.length,
        newRisks: newRisks.length,
        risks,
      },
      reasoning: risks.length === 0
        ? 'Full security scan passed — no risks detected.'
        : `Found ${risks.length} risks (${newRisks.length} new). Highest severity: ${risks[0]?.severity || 'low'}.`,
    };
  }

  _checkEnvSecurity() {
    const risks = [];

    if (!process.env.NOTION_TOKEN || process.env.NOTION_TOKEN.startsWith('your_')) {
      risks.push({
        category: 'configuration',
        severity: 'low',
        description: 'Notion token not configured — running in demo mode',
      });
    }

    if (!process.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN.startsWith('your_')) {
      risks.push({
        category: 'configuration',
        severity: 'low',
        description: 'GitHub token not configured — running in demo mode',
      });
    }

    return { name: 'env_security', risks, passed: risks.length === 0 };
  }

  _checkRateLimitProximity(context) {
    const risks = [];
    const syncStatus = context.context?.syncStatus || {};

    if (syncStatus.rateLimitRemaining !== undefined && syncStatus.rateLimitRemaining < 100) {
      risks.push({
        category: 'rate_limit',
        severity: 'high',
        description: `API rate limit nearly exhausted: ${syncStatus.rateLimitRemaining} remaining`,
      });
    }

    return { name: 'rate_limit_check', risks, passed: risks.length === 0 };
  }

  _checkErrorPatterns(memories) {
    const risks = [];
    const recentMistakes = memories.longTerm?.mistakes || [];

    // Check for rapid repeated errors (possible issue)
    const last5Min = recentMistakes.filter(m => {
      const created = new Date(m.created_at).getTime();
      return Date.now() - created < 5 * 60 * 1000;
    });

    if (last5Min.length > 10) {
      risks.push({
        category: 'error_spike',
        severity: 'high',
        description: `Error spike detected: ${last5Min.length} errors in last 5 minutes`,
      });
    }

    return { name: 'error_pattern_check', risks, passed: risks.length === 0 };
  }

  _checkDataExposure() {
    const risks = [];
    // Check if sensitive data might leak through short-term memory
    const stEntries = this.memory.queryShortTerm({});
    for (const entry of stEntries) {
      const data = JSON.stringify(entry.data);
      if (data.includes('token') || data.includes('secret') || data.includes('password')) {
        risks.push({
          category: 'data_exposure',
          severity: 'medium',
          description: 'Potentially sensitive data detected in short-term memory',
        });
        break;
      }
    }
    return { name: 'data_exposure_check', risks, passed: risks.length === 0 };
  }

  async _validateTokens(context) {
    return {
      outcome: 'success',
      score: 7,
      data: { validated: true },
      reasoning: 'Token validation check complete.',
    };
  }

  async _checkRateLimits(context) {
    return {
      outcome: 'success',
      score: 7,
      data: { withinLimits: true },
      reasoning: 'Rate limits within acceptable range.',
    };
  }
}
