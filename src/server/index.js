// NAOS API Server — Express + WebSocket
// Provides REST API endpoints and real-time updates via WebSocket

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import { createMiddleware } from './middleware.js';
import { validateRequest, TaskSchema } from '../security/validator.js';

export function createServer({ orchestrator, memory, eventBus, logger, rateLimiter }) {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  const { apiLimiter, requestLogger, errorHandler } = createMiddleware(logger);

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);
  app.use('/api', apiLimiter);

  // --- WebSocket ---
  const wsClients = new Set();

  wss.on('connection', (ws) => {
    wsClients.add(ws);
    logger.info(`WebSocket client connected (${wsClients.size} total)`);

    // Send initial state
    ws.send(JSON.stringify({
      type: 'init',
      data: {
        orchestrator: orchestrator.getState(),
        memory: memory.getSystemStats(),
      },
    }));

    ws.on('close', () => {
      wsClients.delete(ws);
      logger.info(`WebSocket client disconnected (${wsClients.size} total)`);
    });
  });

  // Broadcast events to all WebSocket clients
  eventBus.on('*', (event) => {
    const message = JSON.stringify({ type: event.event, data: event.data, timestamp: event.timestamp });
    for (const ws of wsClients) {
      if (ws.readyState === 1) {
        ws.send(message);
      }
    }
  });

  // --- REST API Routes ---

  // Root health route for platforms that probe '/'
  app.get('/', (req, res) => {
    res.json({
      service: 'NAOS API',
      status: 'ok',
      docs: '/api/status',
    });
  });

  app.get('/health', (req, res) => {
    res.status(200).send('ok');
  });

  // System status
  app.get('/api/status', (req, res) => {
    res.json({
      status: 'operational',
      version: '1.0.0',
      uptime: process.uptime(),
      mode: process.env.NAOS_MODE || 'demo',
      orchestrator: orchestrator.getState(),
      memory: memory.getSystemStats(),
      rateLimits: rateLimiter.getStatus(),
    });
  });

  // Agent states
  app.get('/api/agents', (req, res) => {
    const agents = {};
    for (const [name, agent] of Object.entries(orchestrator.agents)) {
      agents[name] = agent.getState();
    }
    res.json({ agents });
  });

  // Memory explorer
  app.get('/api/memory/:layer', (req, res) => {
    const { layer } = req.params;
    const limit = parseInt(req.query.limit || '50', 10);

    try {
      let data;
      switch (layer) {
        case 'short-term':
          data = memory.shortTerm.getAll();
          break;
        case 'long-term':
          const category = req.query.category;
          data = category
            ? memory.queryLongTerm(category, { limit })
            : {
                counts: memory.longTerm.getAllCounts(),
                architectures: memory.queryLongTerm('architecture', { limit: 5 }),
                mistakes: memory.queryLongTerm('mistake', { limit: 10 }),
                improvements: memory.queryLongTerm('improvement', { limit: 10 }),
                patterns: memory.queryLongTerm('pattern', { limit: 10 }),
              };
          break;
        case 'reflection':
          const agent = req.query.agent;
          data = {
            reflections: memory.getReflections({ agent, limit }),
            evolutionLog: memory.getEvolutionLog(limit),
            trend: memory.getEvolutionTrend(),
          };
          break;
        default:
          return res.status(400).json({ error: 'Invalid layer. Use: short-term, long-term, reflection' });
      }
      res.json({ layer, data });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Memory snapshot (all layers combined)
  app.get('/api/memory', (req, res) => {
    res.json(memory.getSnapshot());
  });

  // Evolution history
  app.get('/api/evolution', (req, res) => {
    const limit = parseInt(req.query.limit || '50', 10);
    res.json({
      log: memory.getEvolutionLog(limit),
      trend: memory.getEvolutionTrend(),
    });
  });

  // Tasks
  app.get('/api/tasks', (req, res) => {
    const tasks = memory.getShortTerm('current_tasks') || [];
    res.json({ tasks });
  });

  app.post('/api/tasks', (req, res) => {
    const validation = validateRequest(TaskSchema, req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const task = {
      ...validation.data,
      id: `task-${Date.now()}`,
      createdAt: Date.now(),
      status: 'pending',
    };
    const existing = memory.getShortTerm('current_tasks') || [];
    memory.storeShortTerm('current_tasks', [...existing, task], { source: 'api', ttl: 60 * 60 * 1000 });
    eventBus.emit('task:created', task);
    res.status(201).json(task);
  });

  // Orchestrator control
  app.post('/api/orchestrator/start', (req, res) => {
    orchestrator.start();
    res.json({ status: 'started', state: orchestrator.getState() });
  });

  app.post('/api/orchestrator/stop', (req, res) => {
    orchestrator.stop();
    res.json({ status: 'stopped', state: orchestrator.getState() });
  });

  app.post('/api/orchestrator/step', async (req, res) => {
    try {
      await orchestrator.runCycle();
      res.json({ status: 'cycle_complete', state: orchestrator.getState() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Event history
  app.get('/api/events', (req, res) => {
    const limit = parseInt(req.query.limit || '50', 10);
    res.json({ events: eventBus.getHistory(limit) });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return { app, server, wss };
}
