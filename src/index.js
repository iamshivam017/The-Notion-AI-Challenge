// NAOS — Notion Autonomous Operating System
// Main entry point — wires everything together and starts the system

import 'dotenv/config';
import { MemoryManager } from './memory/MemoryManager.js';
import { EventBus } from './core/EventBus.js';
import { EvolutionEngine } from './core/EvolutionEngine.js';
import { Orchestrator } from './core/Orchestrator.js';
import { ArchitectAgent } from './agents/ArchitectAgent.js';
import { EngineerAgent } from './agents/EngineerAgent.js';
import { SecurityAgent } from './agents/SecurityAgent.js';
import { CriticAgent } from './agents/CriticAgent.js';
import { OptimizerAgent } from './agents/OptimizerAgent.js';
import { ProductStrategist } from './agents/ProductStrategist.js';
import { NotionClient } from './integrations/NotionClient.js';
import { GitHubClient } from './integrations/GitHubClient.js';
import { SyncEngine } from './integrations/SyncEngine.js';
import { RateLimiter } from './security/rateLimiter.js';
import { createLogger } from './security/logger.js';
import { createServer } from './server/index.js';
import { DemoRunner } from './demo/DemoRunner.js';

async function main() {
  // 1. Initialize logger
  const logger = createLogger({ level: process.env.LOG_LEVEL || 'info' });
  logger.info('🚀 NAOS — Notion Autonomous Operating System');
  logger.info(`Mode: ${process.env.NAOS_MODE || 'demo'}`);

  // 2. Initialize memory system
  const memory = new MemoryManager({
    longTermDbPath: 'data/long_term.db',
    reflectionDbPath: 'data/reflection.db',
  });
  await memory.waitForReady();
  logger.info('✅ Memory system initialized (3 layers)');

  // 3. Initialize event bus
  const eventBus = new EventBus();
  logger.info('✅ Event bus initialized');

  // 4. Initialize integrations
  const notionClient = new NotionClient({
    token: process.env.NOTION_TOKEN,
    demoMode: process.env.NAOS_MODE === 'demo',
    logger,
  });

  const githubClient = new GitHubClient({
    token: process.env.GITHUB_TOKEN,
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
    demoMode: process.env.NAOS_MODE === 'demo',
    logger,
  });

  const syncEngine = new SyncEngine({
    notionClient,
    githubClient,
    memory,
    logger,
  });
  logger.info('✅ Integration layer initialized');

  // 5. Initialize rate limiter
  const rateLimiter = new RateLimiter();

  // 6. Initialize agents
  const agentDeps = { memory, eventBus, logger };
  const agents = {
    architect: new ArchitectAgent(agentDeps),
    engineer: new EngineerAgent(agentDeps, { notionClient, githubClient, syncEngine }),
    security: new SecurityAgent(agentDeps),
    critic: new CriticAgent(agentDeps),
    optimizer: new OptimizerAgent(agentDeps),
    strategist: new ProductStrategist(agentDeps),
  };
  logger.info(`✅ ${Object.keys(agents).length} agents initialized`);

  // 7. Initialize evolution engine
  const evolutionEngine = new EvolutionEngine(memory, eventBus);

  // 8. Initialize orchestrator
  const orchestrator = new Orchestrator({
    agents,
    memory,
    eventBus,
    evolutionEngine,
    syncEngine,
    logger,
  });
  logger.info('✅ Orchestrator initialized');

  // 9. Initialize demo runner
  const demoRunner = new DemoRunner({ memory, eventBus, orchestrator, logger });

  // 10. Create and start server
  const port = parseInt(process.env.PORT || '3000', 10);
  const { server } = createServer({ orchestrator, memory, eventBus, logger, rateLimiter });

  server.listen(port, () => {
    logger.info(`✅ NAOS server listening on http://localhost:${port}`);
    logger.info(`📊 Dashboard: http://localhost:${process.env.DASHBOARD_PORT || 5173}`);
    logger.info('');
    logger.info('Available endpoints:');
    logger.info(`  GET  http://localhost:${port}/api/status`);
    logger.info(`  GET  http://localhost:${port}/api/agents`);
    logger.info(`  GET  http://localhost:${port}/api/memory`);
    logger.info(`  GET  http://localhost:${port}/api/evolution`);
    logger.info(`  POST http://localhost:${port}/api/orchestrator/start`);
    logger.info(`  POST http://localhost:${port}/api/orchestrator/stop`);
    logger.info(`  POST http://localhost:${port}/api/orchestrator/step`);
    logger.info(`  WS   ws://localhost:${port}/ws`);
    logger.info('');

    // Auto-run demo in demo mode
    if (process.env.NAOS_MODE === 'demo' || !process.env.NOTION_TOKEN || process.env.NOTION_TOKEN.startsWith('your_')) {
      logger.info('🎬 DEMO MODE: Running initial demo sequence...');
      demoRunner.runFullDemo().then(() => {
        logger.info('🎬 Demo sequence complete. System is ready.');
        logger.info('💡 Open the dashboard to see the results, or use POST /api/orchestrator/start to begin continuous operation.');
      });
    }
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Shutting down NAOS...');
    orchestrator.stop();
    memory.destroy();
    server.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Shutting down NAOS...');
    orchestrator.stop();
    memory.destroy();
    server.close();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('Fatal error starting NAOS:', err);
  process.exit(1);
});
