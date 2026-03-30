// SystemOverview — Hero dashboard with orbital visualization, metrics, and controls
import { API_BASE } from '../main.js';

export function renderSystemOverview(container, state) {
  const { orchestrator = {}, memory = {}, agents = {} } = state;
  const orch = orchestrator;

  container.innerHTML = `
    <!-- Hero -->
    <div class="overview-hero">
      <div class="hero-content">
        <h1 class="hero-title">System ${orch.state === 'running' ? 'Active' : orch.state === 'error' ? 'Error' : 'Standby'}</h1>
        <p class="hero-description">
          NAOS is ${orch.state === 'running' ? 'actively learning and evolving' : 'ready to begin autonomous operation'}. 
          ${orch.iteration > 0 ? `Completed ${orch.iteration} iteration${orch.iteration !== 1 ? 's' : ''}.` : 'No iterations yet.'}
        </p>
        <div class="hero-actions">
          ${orch.running
            ? `<button class="btn btn-danger" id="btn-stop">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                Stop
              </button>`
            : `<button class="btn btn-primary" id="btn-start">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Start
              </button>`
          }
          <button class="btn btn-secondary" id="btn-step">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
            Step
          </button>
        </div>
      </div>
      <div class="orbital-container">
        <div class="orbital-track orbital-track-1"></div>
        <div class="orbital-track orbital-track-2"></div>
        <div class="orbital-track orbital-track-3"></div>
        <div class="orbital-core">NAOS</div>
        <div class="orbital-agent architect" title="Architect">🏗</div>
        <div class="orbital-agent engineer" title="Engineer">⚙</div>
        <div class="orbital-agent security" title="Security">🔐</div>
        <div class="orbital-agent critic" title="Critic">🔍</div>
        <div class="orbital-agent optimizer" title="Optimizer">⚡</div>
        <div class="orbital-agent strategist" title="Strategist">🎯</div>
      </div>
    </div>

    <!-- Metrics -->
    <div class="metrics-grid">
      <div class="metric-card purple">
        <div class="metric-label">Iterations</div>
        <div class="metric-value">${orch.iteration || 0}</div>
        <div class="metric-change neutral">Cycle ${orch.metrics?.totalCycles || 0}</div>
      </div>
      <div class="metric-card cyan">
        <div class="metric-label">Actions</div>
        <div class="metric-value">${orch.metrics?.totalActions || 0}</div>
        <div class="metric-change ${(orch.metrics?.totalErrors || 0) > 0 ? 'negative' : 'positive'}">
          ${(orch.metrics?.totalErrors || 0)} errors
        </div>
      </div>
      <div class="metric-card green">
        <div class="metric-label">Memory Entries</div>
        <div class="metric-value">${(memory.shortTerm?.size || 0) + (memory.longTerm?.counts?.architectures || 0) + (memory.longTerm?.counts?.mistakes || 0) + (memory.longTerm?.counts?.improvements || 0) + (memory.reflection?.reflectionCount || 0)}</div>
        <div class="metric-change neutral">Across 3 layers</div>
      </div>
      <div class="metric-card orange">
        <div class="metric-label">Avg Cycle</div>
        <div class="metric-value">${orch.metrics?.avgCycleTimeMs ? Math.round(orch.metrics.avgCycleTimeMs) + 'ms' : '—'}</div>
        <div class="metric-change neutral">Processing time</div>
      </div>
    </div>

    <!-- Grid -->
    <div class="overview-grid">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Memory Distribution</div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${renderMemoryBar('Short-Term', memory.shortTerm?.size || 0, 100, 'var(--accent-primary)')}
          ${renderMemoryBar('Long-Term', (memory.longTerm?.counts?.architectures || 0) + (memory.longTerm?.counts?.mistakes || 0) + (memory.longTerm?.counts?.improvements || 0) + (memory.longTerm?.counts?.patterns || 0), 200, 'var(--accent-cyan)')}
          ${renderMemoryBar('Reflection', memory.reflection?.reflectionCount || 0, 100, 'var(--accent-green)')}
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">Active Agents</div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${Object.entries(agents).map(([name, agent]) => `
            <div style="display: flex; align-items: center; gap: 8px; padding: 6px 0;">
              <div class="agent-status-indicator ${agent?.status || 'idle'}"></div>
              <span style="font-size: 0.85rem; font-weight: 500; text-transform: capitalize; flex: 1;">${name}</span>
              <span style="font-size: 0.75rem; color: var(--text-tertiary); font-family: var(--font-mono);">${agent?.totalExecutions || 0} runs</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Bind events
  const btnStart = container.querySelector('#btn-start');
  const btnStop = container.querySelector('#btn-stop');
  const btnStep = container.querySelector('#btn-step');

  const onRefresh = state._onRefresh;

  async function callAPI(url, btn, label) {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="loading-spinner"></span> ${label}...`;
    }
    try {
      await fetch(url, { method: 'POST' });
    } catch (e) {
      console.error('API call failed:', e);
    }
    // Small delay to let backend finish processing
    await new Promise(r => setTimeout(r, 300));
    if (onRefresh) await onRefresh();
    if (btn) btn.disabled = false;
  }

  if (btnStart) btnStart.addEventListener('click', () => callAPI(`${API_BASE}/api/orchestrator/start`, btnStart, 'Starting'));
  if (btnStop) btnStop.addEventListener('click', () => callAPI(`${API_BASE}/api/orchestrator/stop`, btnStop, 'Stopping'));
  if (btnStep) btnStep.addEventListener('click', () => callAPI(`${API_BASE}/api/orchestrator/step`, btnStep, 'Running'));
}

function renderMemoryBar(label, value, max, color) {
  const percent = Math.min(100, (value / Math.max(1, max)) * 100);
  return `
    <div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="font-size: 0.8rem; color: var(--text-secondary);">${label}</span>
        <span style="font-size: 0.8rem; font-family: var(--font-mono); color: var(--text-tertiary);">${value}</span>
      </div>
      <div style="height: 6px; background: var(--bg-glass); border-radius: 3px; overflow: hidden;">
        <div style="height: 100%; width: ${percent}%; background: ${color}; border-radius: 3px; transition: width 0.5s ease;"></div>
      </div>
    </div>
  `;
}
