// MemoryExplorer — Interactive browser for all three memory layers
import { API_BASE } from '../main.js';

export function renderMemoryExplorer(container, memoryData) {
  const data = memoryData || {};

  container.innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Memory Explorer</h2>
        <p class="section-subtitle">Browse and search across all three memory layers</p>
      </div>
      <button class="btn btn-secondary btn-sm" id="btn-refresh-memory">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0115-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 01-15 6.7L3 16"/></svg>
        Refresh
      </button>
    </div>

    <div class="memory-tabs">
      <button class="memory-tab active" data-memory-tab="short-term">
        💾 Short-Term <span class="memory-badge short-term">${data.shortTerm?.length || 0}</span>
      </button>
      <button class="memory-tab" data-memory-tab="long-term">
        🧠 Long-Term <span class="memory-badge long-term">${countLongTerm(data.longTerm)}</span>
      </button>
      <button class="memory-tab" data-memory-tab="reflection">
        🔁 Reflection <span class="memory-badge reflection">${data.reflection?.recentReflections?.length || 0}</span>
      </button>
    </div>

    <!-- Short-Term Memory -->
    <div class="memory-content active" data-memory-content="short-term">
      ${renderShortTermMemory(data.shortTerm || [])}
    </div>

    <!-- Long-Term Memory -->
    <div class="memory-content" data-memory-content="long-term">
      ${renderLongTermMemory(data.longTerm || {})}
    </div>

    <!-- Reflection Memory -->
    <div class="memory-content" data-memory-content="reflection">
      ${renderReflectionMemory(data.reflection || {})}
    </div>
  `;

  // Tab switching
  container.querySelectorAll('.memory-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.memory-tab').forEach(t => t.classList.remove('active'));
      container.querySelectorAll('.memory-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      container.querySelector(`[data-memory-content="${tab.dataset.memoryTab}"]`).classList.add('active');
    });
  });

  // Expand/collapse entries
  container.querySelectorAll('.memory-entry').forEach(entry => {
    entry.addEventListener('click', () => entry.classList.toggle('expanded'));
  });

  // Refresh
  const btnRefresh = container.querySelector('#btn-refresh-memory');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      const res = await fetch(`${API_BASE}/api/memory`);
      const newData = await res.json();
      renderMemoryExplorer(container, newData);
    });
  }
}

function renderShortTermMemory(entries) {
  if (entries.length === 0) {
    return `<div class="empty-state">
      <div class="empty-state-icon">💾</div>
      <div class="empty-state-title">No short-term memories yet</div>
      <p>Short-term memories will appear as the system operates</p>
    </div>`;
  }

  return entries.map(entry => `
    <div class="memory-entry">
      <div class="memory-entry-header">
        <span class="memory-entry-key">${entry.key || 'unknown'}</span>
        <span class="memory-entry-time">${formatTime(entry.createdAt)} • ttl: ${Math.round((entry.ttl || 0) / 1000)}s • from: ${entry.source || 'system'}</span>
      </div>
      <div class="memory-entry-value">${formatJSON(entry.data)}</div>
    </div>
  `).join('');
}

function renderLongTermMemory(ltData) {
  const sections = [];

  // Architectures
  const archs = ltData.architectures || [];
  if (archs.length > 0) {
    sections.push(`<h3 style="font-size: 0.85rem; color: var(--accent-cyan); margin: 16px 0 8px; font-weight: 600;">📐 Architectures (${archs.length})</h3>`);
    sections.push(archs.map(a => `
      <div class="memory-entry">
        <div class="memory-entry-header">
          <span class="memory-entry-key">v${a.version} • Score: ${a.score || 0}/10</span>
          <span class="memory-entry-time">${a.created_at || ''}</span>
        </div>
        <div class="memory-entry-value">${formatJSON(a.structure)}</div>
      </div>
    `).join(''));
  }

  // Mistakes
  const mistakes = ltData.recentMistakes || [];
  if (mistakes.length > 0) {
    sections.push(`<h3 style="font-size: 0.85rem; color: var(--accent-red); margin: 16px 0 8px; font-weight: 600;">⚠️ Mistakes (${mistakes.length})</h3>`);
    sections.push(mistakes.map(m => `
      <div class="memory-entry">
        <div class="memory-entry-header">
          <span class="memory-entry-key">[${m.agent}] ${m.severity || 'medium'}</span>
          <span class="memory-entry-time">${m.created_at || ''}</span>
        </div>
        <div class="memory-entry-value">${m.description}${m.resolution ? `\n✅ Resolution: ${m.resolution}` : ''}</div>
      </div>
    `).join(''));
  }

  // Improvements
  const improvements = ltData.recentImprovements || [];
  if (improvements.length > 0) {
    sections.push(`<h3 style="font-size: 0.85rem; color: var(--accent-green); margin: 16px 0 8px; font-weight: 600;">📈 Improvements (${improvements.length})</h3>`);
    sections.push(improvements.map(i => `
      <div class="memory-entry">
        <div class="memory-entry-header">
          <span class="memory-entry-key">${i.area} • Impact: ${i.impact_score || 0}</span>
          <span class="memory-entry-time">${i.created_at || ''}</span>
        </div>
        <div class="memory-entry-value">Before: ${formatJSON(i.before_state)}\nAfter: ${formatJSON(i.after_state)}</div>
      </div>
    `).join(''));
  }

  // Patterns
  const patterns = ltData.topPatterns || [];
  if (patterns.length > 0) {
    sections.push(`<h3 style="font-size: 0.85rem; color: var(--accent-orange); margin: 16px 0 8px; font-weight: 600;">🔄 Patterns (${patterns.length})</h3>`);
    sections.push(patterns.map(p => `
      <div class="memory-entry">
        <div class="memory-entry-header">
          <span class="memory-entry-key">${p.category} • freq: ${p.frequency}</span>
          <span class="memory-entry-time">${p.last_seen || ''}</span>
        </div>
        <div class="memory-entry-value">${formatJSON(p.pattern_data)}</div>
      </div>
    `).join(''));
  }

  if (sections.length === 0) {
    return `<div class="empty-state">
      <div class="empty-state-icon">🧠</div>
      <div class="empty-state-title">No long-term memories yet</div>
      <p>Long-term memories persist across sessions</p>
    </div>`;
  }

  return sections.join('');
}

function renderReflectionMemory(refData) {
  const reflections = refData.recentReflections || [];
  const evolution = refData.recentEvolution || [];

  const sections = [];

  if (reflections.length > 0) {
    sections.push(`<h3 style="font-size: 0.85rem; color: var(--accent-green); margin: 0 0 8px; font-weight: 600;">💭 Recent Reflections</h3>`);
    sections.push(reflections.map(r => `
      <div class="memory-entry">
        <div class="memory-entry-header">
          <span class="memory-entry-key">[${r.agent}] ${r.action} → ${r.outcome}</span>
          <span class="memory-entry-time">Score: ${r.score}/10 • Iteration ${r.iteration}</span>
        </div>
        <div class="memory-entry-value">${r.reasoning || 'No reasoning provided'}</div>
      </div>
    `).join(''));
  }

  if (evolution.length > 0) {
    sections.push(`<h3 style="font-size: 0.85rem; color: var(--accent-secondary); margin: 16px 0 8px; font-weight: 600;">🔬 Evolution Log</h3>`);
    sections.push(evolution.map(e => `
      <div class="memory-entry">
        <div class="memory-entry-header">
          <span class="memory-entry-key">Iteration ${e.iteration} • ${e.phase}</span>
          <span class="memory-entry-time">Δ ${(e.improvement_delta * 100).toFixed(1)}%</span>
        </div>
        <div class="memory-entry-value">${formatJSON(e.changes_made)}</div>
      </div>
    `).join(''));
  }

  if (sections.length === 0) {
    return `<div class="empty-state">
      <div class="empty-state-icon">🔁</div>
      <div class="empty-state-title">No reflections yet</div>
      <p>Agents will reflect on their actions as the system operates</p>
    </div>`;
  }

  return sections.join('');
}

function countLongTerm(lt) {
  if (!lt || !lt.counts) return 0;
  return Object.values(lt.counts).reduce((a, b) => a + b, 0);
}

function formatJSON(data) {
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString();
}
