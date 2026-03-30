// EvolutionLog — Timeline showing self-improvement history and metrics
import { API_BASE } from '../main.js';

export function renderEvolutionLog(container, evolutionData) {
  const { log = [], trend = [] } = evolutionData || {};

  container.innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Evolution Log</h2>
        <p class="section-subtitle">Self-improvement timeline — tracking how NAOS learns and adapts</p>
      </div>
      <button class="btn btn-secondary btn-sm" id="btn-refresh-evolution">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0115-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 01-15 6.7L3 16"/></svg>
        Refresh
      </button>
    </div>

    <!-- Trend Summary -->
    ${trend.length > 0 ? renderTrendSummary(trend) : ''}

    <!-- Timeline -->
    <div class="evolution-timeline">
      ${log.length > 0 ? log.map(renderEvolutionEntry).join('') : `
        <div class="empty-state">
          <div class="empty-state-icon">📈</div>
          <div class="empty-state-title">No evolution data yet</div>
          <p>Run the orchestrator to begin tracking system evolution</p>
        </div>
      `}
    </div>
  `;

  // Refresh
  const btnRefresh = container.querySelector('#btn-refresh-evolution');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      const res = await fetch(`${API_BASE}/api/evolution`);
      const newData = await res.json();
      renderEvolutionLog(container, newData);
    });
  }
}

function renderTrendSummary(trend) {
  const latest = trend[trend.length - 1] || {};
  const avgDelta = trend.reduce((sum, t) => sum + (t.avg_delta || 0), 0) / trend.length;
  const improving = avgDelta > 0;

  return `
    <div class="metrics-grid" style="margin-bottom: 24px;">
      <div class="metric-card ${improving ? 'green' : 'orange'}">
        <div class="metric-label">Trend</div>
        <div class="metric-value" style="font-size: 1.5rem;">${improving ? '↑ Improving' : avgDelta < -0.05 ? '↓ Declining' : '→ Stable'}</div>
        <div class="metric-change ${improving ? 'positive' : 'neutral'}">Avg delta: ${(avgDelta * 100).toFixed(2)}%</div>
      </div>
      <div class="metric-card purple">
        <div class="metric-label">Iterations</div>
        <div class="metric-value">${trend.length}</div>
        <div class="metric-change neutral">Total evolution cycles</div>
      </div>
      <div class="metric-card cyan">
        <div class="metric-label">Total Changes</div>
        <div class="metric-value">${trend.reduce((sum, t) => sum + (t.changes || 0), 0)}</div>
        <div class="metric-change neutral">Across all iterations</div>
      </div>
    </div>

    <!-- Sparkline visualization -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <div class="card-title">Improvement Trajectory</div>
      </div>
      <div style="display: flex; align-items: flex-end; gap: 4px; height: 60px; padding: 8px 0;">
        ${trend.map((t, i) => {
          const delta = t.avg_delta || 0;
          const normalizedHeight = Math.max(4, Math.min(56, (delta + 0.5) * 56));
          const color = delta > 0 ? 'var(--accent-green)' : delta < -0.05 ? 'var(--accent-red)' : 'var(--accent-cyan)';
          return `
            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;">
              <div style="width: 100%; max-width: 30px; height: ${normalizedHeight}px; background: ${color}; border-radius: 3px; opacity: ${0.3 + (i / trend.length) * 0.7}; transition: all 0.3s;"></div>
              <span style="font-size: 0.55rem; color: var(--text-tertiary);">${t.iteration}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderEvolutionEntry(entry) {
  const phase = entry.phase || 'unknown';
  const phaseClass = phase === 'improving' ? 'improving' : phase === 'regressing' ? 'regressing' : 'stable';
  const delta = entry.improvement_delta || 0;

  const changes = entry.changes_made || {};
  const evaluation = changes.evaluation || {};
  const suggestions = changes.suggestions || [];

  return `
    <div class="evolution-entry">
      <div class="evolution-dot ${phaseClass}"></div>
      <div class="evolution-card">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="evolution-iteration">Iteration ${entry.iteration}</span>
          <span class="evolution-phase ${phaseClass}">${phase}</span>
          <span style="flex: 1;"></span>
          <span style="font-size: 0.7rem; color: var(--text-tertiary);">${entry.created_at || ''}</span>
        </div>

        ${evaluation.details && evaluation.details.length > 0 ? `
          <div class="evolution-description">
            ${evaluation.details.map(d => `• ${d}`).join('<br>')}
          </div>
        ` : ''}

        ${suggestions.length > 0 ? `
          <div style="margin-top: 8px;">
            <span style="font-size: 0.7rem; color: var(--accent-orange); font-weight: 600;">SUGGESTIONS:</span>
            ${suggestions.map(s => `
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px; padding-left: 8px; border-left: 2px solid var(--accent-orange);">
                ${s.reason || s.suggestion || JSON.stringify(s)}
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="evolution-delta ${delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral'}">
          Δ ${delta > 0 ? '+' : ''}${(delta * 100).toFixed(2)}%
        </div>
      </div>
    </div>
  `;
}
