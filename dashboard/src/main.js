// NAOS Dashboard — Main entry point
// Manages WebSocket connection, routing, state, and renders components

import { renderSystemOverview } from './components/SystemOverview.js';
import { renderAgentMonitor } from './components/AgentMonitor.js';
import { renderMemoryExplorer } from './components/MemoryExplorer.js';
import { renderTaskManager } from './components/TaskManager.js';
import { renderEvolutionLog } from './components/EvolutionLog.js';

// Production: configure backend URLs via Vite env vars.
// Local fallback keeps current dev workflow unchanged.
const envApiBase = (import.meta.env.VITE_API_BASE || '').trim().replace(/\/+$/, '');
const fallbackApiBase = `${window.location.protocol}//${window.location.hostname}:3000`;

export const API_BASE = envApiBase || fallbackApiBase;

const envWsBase = (import.meta.env.VITE_WS_BASE || '').trim().replace(/\/+$/, '');
const derivedWsBase = API_BASE.replace(/^http/i, 'ws');
const WS_URL = envWsBase
  ? (envWsBase.endsWith('/ws') ? envWsBase : `${envWsBase}/ws`)
  : `${derivedWsBase}/ws`;

class NAOSDashboard {
  constructor() {
    this.state = {
      orchestrator: {},
      agents: {},
      memory: {},
      tasks: [],
      evolution: { log: [], trend: [] },
      events: [],
      connected: false,
    };

    this.ws = null;
    this.reconnectTimer = null;
    this.activeTab = 'overview';

    this.init();
  }

  async init() {
    this.bindNavigation();
    this.bindEventStream();
    this.connectWebSocket();
    await this.fetchInitialState();
    this.render();
    this.startPolling();
  }

  // --- WebSocket ---
  connectWebSocket() {
    const wsUrl = WS_URL;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.state.connected = true;
        this.updateStatusBadge('running', 'Connected');
        this.addEvent('system', 'WebSocket connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleWSMessage(msg);
        } catch (e) {
          console.warn('Failed to parse WS message:', e);
        }
      };

      this.ws.onclose = () => {
        this.state.connected = false;
        this.updateStatusBadge('error', 'Disconnected');
        this.addEvent('system', 'WebSocket disconnected');
        // Reconnect after 3s
        this.reconnectTimer = setTimeout(() => this.connectWebSocket(), 3000);
      };

      this.ws.onerror = () => {
        this.state.connected = false;
      };
    } catch (e) {
      console.warn('WebSocket connection failed:', e);
      this.reconnectTimer = setTimeout(() => this.connectWebSocket(), 3000);
    }
  }

  handleWSMessage(msg) {
    const { type, data } = msg;

    switch (type) {
      case 'init':
        if (data.orchestrator) this.state.orchestrator = data.orchestrator;
        if (data.memory) this.state.memory = data.memory;
        this.render();
        break;

      case 'cycle:start':
        this.addEvent('cycle', `Cycle ${data.iteration} started`);
        this.state.orchestrator.iteration = data.iteration;
        break;

      case 'cycle:complete':
        this.addEvent('cycle', `Cycle ${data.iteration} complete (${data.cycleTimeMs}ms)`);
        this.state.orchestrator.state = 'running';
        this.refreshData();
        break;

      case 'cycle:error':
        this.addEvent('error', `Cycle ${data.iteration} error: ${data.error}`);
        break;

      case 'agent:executing':
        this.addEvent('agent', `${data.agent} executing: ${data.context?.type || ''}`);
        break;

      case 'agent:completed':
        this.addEvent('agent', `${data.agent} → ${data.outcome} (${data.durationMs}ms)`);
        break;

      case 'agent:reflected':
        this.addEvent('reflect', `${data.agent} reflected (score: ${data.score})`);
        break;

      case 'evolution:complete':
        this.addEvent('evolution', `Evolution: ${data.evaluation?.improving ? '↑ improving' : data.evaluation?.regressing ? '↓ regressing' : '→ stable'}`);
        break;

      case 'orchestrator:started':
        this.state.orchestrator.running = true;
        this.state.orchestrator.state = 'running';
        this.updateStatusBadge('running', 'Running');
        this.addEvent('system', 'Orchestrator started');
        this.render();
        break;

      case 'orchestrator:stopped':
        this.state.orchestrator.running = false;
        this.state.orchestrator.state = 'idle';
        this.updateStatusBadge('', 'Stopped');
        this.addEvent('system', 'Orchestrator stopped');
        this.render();
        break;

      case 'demo:step':
        this.addEvent('demo', `Step ${data.step}: ${data.name}`);
        break;

      case 'demo:completed':
        this.addEvent('demo', 'Demo completed!');
        this.refreshData();
        break;

      default:
        if (type && !type.startsWith('phase:')) {
          this.addEvent('event', type);
        }
    }
  }

  // --- Data Fetching ---
  async fetchInitialState() {
    try {
      const [status, agents, memory, evolution] = await Promise.all([
        fetch(`${API_BASE}/api/status`).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/api/agents`).then(r => r.json()).catch(() => ({ agents: {} })),
        fetch(`${API_BASE}/api/memory`).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/api/evolution`).then(r => r.json()).catch(() => ({ log: [], trend: [] })),
      ]);

      this.state.orchestrator = status.orchestrator || {};
      this.state.memory = status.memory || {};
      this.state.agents = agents.agents || {};
      this.state.evolution = evolution;

      if (status.orchestrator?.state === 'running') {
        this.updateStatusBadge('running', 'Running');
      } else {
        this.updateStatusBadge('', status.mode === 'demo' ? 'Demo Mode' : 'Ready');
      }
    } catch (e) {
      console.warn('Failed to fetch initial state:', e);
      this.updateStatusBadge('error', 'No Connection');
    }
  }

  async refreshData() {
    try {
      const [status, agents, memory, evolution] = await Promise.all([
        fetch(`${API_BASE}/api/status`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/api/agents`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/api/memory`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/api/evolution`).then(r => r.json()).catch(() => null),
      ]);

      if (status) {
        this.state.orchestrator = status.orchestrator || this.state.orchestrator;
        this.state.memory = status.memory || this.state.memory;
      }
      if (agents) this.state.agents = agents.agents || this.state.agents;
      if (memory) this.state.memorySnapshot = memory;
      if (evolution) this.state.evolution = evolution;

      this.render();
    } catch (e) {
      console.warn('Refresh failed:', e);
    }
  }

  startPolling() {
    // Poll every 5 seconds for updates
    setInterval(() => this.refreshData(), 5000);
  }

  async fetchTasks() {
    try {
      const res = await fetch(`${API_BASE}/api/tasks`);
      const data = await res.json();
      this.state.tasks = data.tasks || [];
      this.render();
    } catch (e) {
      console.warn('Failed to fetch tasks:', e);
    }
  }

  // --- Navigation ---
  bindNavigation() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.dataset.tab);
      });
    });
  }

  switchTab(tabName) {
    this.activeTab = tabName;

    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Update panels
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const activePanel = document.getElementById(`panel-${tabName}`);
    if (activePanel) activePanel.classList.add('active');

    this.render();
  }

  // --- Event Stream ---
  bindEventStream() {
    const toggle = document.getElementById('toggle-stream');
    const stream = document.getElementById('event-stream');

    if (toggle && stream) {
      toggle.addEventListener('click', () => {
        stream.classList.toggle('collapsed');
      });
    }
  }

  addEvent(type, message) {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    this.state.events.unshift({ type, message, time });
    if (this.state.events.length > 50) this.state.events = this.state.events.slice(0, 50);

    const eventList = document.getElementById('event-list');
    if (eventList) {
      const el = document.createElement('div');
      el.className = 'event-item';
      el.innerHTML = `
        <span class="event-time">${time}</span>
        <span class="event-type">${type}</span>
        <span class="event-data">${message}</span>
      `;
      eventList.prepend(el);

      // Keep max 30 events in DOM
      while (eventList.children.length > 30) {
        eventList.removeChild(eventList.lastChild);
      }
    }
  }

  // --- Status Badge ---
  updateStatusBadge(dotClass, text) {
    const dot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    if (dot) {
      dot.className = 'status-dot';
      if (dotClass) dot.classList.add(dotClass);
    }
    if (statusText) statusText.textContent = text;
  }

  // --- Render ---
  render() {
    switch (this.activeTab) {
      case 'overview':
        renderSystemOverview(
          document.getElementById('system-overview'),
          {
            orchestrator: this.state.orchestrator,
            memory: this.state.memory,
            agents: this.state.agents,
            _onRefresh: () => this.refreshData(),
          }
        );
        break;

      case 'agents':
        renderAgentMonitor(
          document.getElementById('agent-monitor'),
          this.state.agents
        );
        break;

      case 'memory':
        renderMemoryExplorer(
          document.getElementById('memory-explorer'),
          this.state.memorySnapshot || {}
        );
        break;

      case 'tasks':
        renderTaskManager(
          document.getElementById('task-manager'),
          this.state.tasks,
          () => this.fetchTasks()
        );
        break;

      case 'evolution':
        renderEvolutionLog(
          document.getElementById('evolution-log'),
          this.state.evolution
        );
        break;
    }
  }
}

// Initialize
const dashboard = new NAOSDashboard();
