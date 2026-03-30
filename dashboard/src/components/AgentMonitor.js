// AgentMonitor — Real-time agent status cards with activity indicators and stats

const AGENT_CONFIG = {
  architect: { emoji: '🏗', role: 'System Architect', color: 'var(--accent-primary)' },
  engineer: { emoji: '⚙️', role: 'Build Engineer', color: 'var(--accent-cyan)' },
  security: { emoji: '🔐', role: 'Security Analyst', color: 'var(--accent-red)' },
  critic: { emoji: '🔍', role: 'Quality Critic', color: 'var(--accent-orange)' },
  optimizer: { emoji: '⚡', role: 'Performance Optimizer', color: 'var(--accent-green)' },
  strategist: { emoji: '🎯', role: 'Product Strategist', color: 'var(--accent-pink)' },
};

export function renderAgentMonitor(container, agents) {
  container.innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Agent System</h2>
        <p class="section-subtitle">Real-time status of all autonomous agents</p>
      </div>
    </div>
    <div class="agents-grid">
      ${Object.entries(agents).map(([name, state]) => renderAgentCard(name, state)).join('')}
    </div>
  `;
}

function renderAgentCard(name, state) {
  const config = AGENT_CONFIG[name] || { emoji: '🤖', role: 'Agent', color: 'var(--text-tertiary)' };
  const st = state || {};

  return `
    <div class="agent-card" data-agent="${name}">
      <div class="agent-header">
        <div class="agent-icon" style="background: ${config.color}22; color: ${config.color};">
          ${config.emoji}
        </div>
        <div>
          <div class="agent-name">${capitalize(name)}</div>
          <div class="agent-role">${config.role}</div>
        </div>
        <div class="agent-status-indicator ${st.status || 'idle'}" title="${st.status || 'idle'}"></div>
      </div>

      ${st.lastAction ? `
        <div class="agent-last-action">
          Last: <span style="color: var(--accent-cyan);">${st.lastAction}</span> → 
          <span style="color: ${st.lastResult === 'success' ? 'var(--accent-green)' : st.lastResult === 'failure' ? 'var(--accent-red)' : 'var(--text-tertiary)'};">
            ${st.lastResult || 'none'}
          </span>
        </div>
      ` : `
        <div class="agent-last-action" style="color: var(--text-tertiary);">No actions yet</div>
      `}

      <div class="agent-stats">
        <div class="agent-stat">
          <div class="agent-stat-value" style="color: var(--text-primary);">${st.totalExecutions || 0}</div>
          <div class="agent-stat-label">Runs</div>
        </div>
        <div class="agent-stat">
          <div class="agent-stat-value" style="color: var(--accent-green);">${st.totalSuccesses || 0}</div>
          <div class="agent-stat-label">Success</div>
        </div>
        <div class="agent-stat">
          <div class="agent-stat-value" style="color: var(--accent-red);">${st.totalFailures || 0}</div>
          <div class="agent-stat-label">Failures</div>
        </div>
      </div>

      ${st.avgExecutionMs ? `
        <div style="margin-top: 12px; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 0.7rem; color: var(--text-tertiary);">Avg:</span>
          <span style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--text-secondary);">${Math.round(st.avgExecutionMs)}ms</span>
          <div class="sparkline" style="flex: 1;">
            ${generateSparkline(st.totalExecutions || 0)}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function generateSparkline(executions) {
  const bars = [];
  const count = Math.min(12, Math.max(3, executions));
  for (let i = 0; i < count; i++) {
    const height = Math.max(4, Math.random() * 28);
    bars.push(`<div class="sparkline-bar" style="height: ${height}px;"></div>`);
  }
  return bars.join('');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
