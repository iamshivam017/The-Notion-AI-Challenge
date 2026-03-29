"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const config_1 = require("./config");
const sync_1 = require("./integrations/notion/sync");
const sync_2 = require("./integrations/github/sync");
const builder_1 = require("./context/builder");
const orchestrator_1 = require("./agents/orchestrator");
const webhook_1 = require("./integrations/github/webhook");
const event_queue_1 = require("./queue/event_queue");
const event_queue_2 = require("./queue/event_queue");
const human_gate_1 = require("./safety/human_gate");
const audit_log_1 = require("./safety/audit_log");
// ---------------------------------------------------------------------------
// Core run loop
// ---------------------------------------------------------------------------
async function runNAOS() {
    console.log('\n📡 Syncing data sources...');
    const [notionPages, githubData] = await Promise.all([
        (0, sync_1.syncNotionWorkspace)(),
        (0, sync_2.syncGitHub)(),
    ]);
    const context = await (0, builder_1.buildContext)(notionPages, githubData, true);
    const orchestrator = new orchestrator_1.OrchestratorAgent();
    await orchestrator.run(context);
}
// ---------------------------------------------------------------------------
// Simple cron scheduler (no external dependency)
// ---------------------------------------------------------------------------
function parseCron(cron) {
    // Support "*/N * * * *" (every N minutes) only for simplicity
    const match = cron.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
    if (match)
        return parseInt(match[1], 10) * 60_000;
    // Default: every 30 minutes
    return 30 * 60_000;
}
function startScheduler(cfg) {
    const intervalMs = parseCron(cfg.RUN_CRON);
    console.log(`⏰ Scheduler: running every ${intervalMs / 60_000} minutes`);
    return setInterval(async () => {
        try {
            await runNAOS();
        }
        catch (err) {
            console.error('[Scheduler] Run failed:', err);
        }
    }, intervalMs);
}
// ---------------------------------------------------------------------------
// HTTP server (webhooks + health + approval endpoints)
// ---------------------------------------------------------------------------
async function handleRequest(req, res) {
    const url = new URL(req.url ?? '/', `http://localhost`);
    // Health check
    if (req.method === 'GET' && url.pathname === '/health') {
        const integrity = audit_log_1.auditLog.verify();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', auditLog: integrity }));
        return;
    }
    // Manual trigger
    if (req.method === 'POST' && url.pathname === '/run') {
        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Run triggered' }));
        runNAOS().catch(err => console.error('[ManualTrigger] Failed:', err));
        return;
    }
    // Human gate: approve
    if (req.method === 'POST' && url.pathname === '/approve') {
        const chunks = [];
        for await (const chunk of req)
            chunks.push(chunk);
        const { taskId } = JSON.parse(Buffer.concat(chunks).toString());
        const ok = (0, human_gate_1.approve)(taskId);
        res.writeHead(ok ? 200 : 404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok, taskId }));
        return;
    }
    // Human gate: reject
    if (req.method === 'POST' && url.pathname === '/reject') {
        const chunks = [];
        for await (const chunk of req)
            chunks.push(chunk);
        const { taskId } = JSON.parse(Buffer.concat(chunks).toString());
        const ok = (0, human_gate_1.reject)(taskId);
        res.writeHead(ok ? 200 : 404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok, taskId }));
        return;
    }
    // GitHub webhook
    if (req.method === 'POST' && url.pathname === '/webhook/github') {
        await (0, webhook_1.handleGitHubWebhook)(req, res);
        return;
    }
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
}
// ---------------------------------------------------------------------------
// Webhook event handler — enqueue events for next run
// ---------------------------------------------------------------------------
(0, webhook_1.onWebhookEvent)(async (event, payload) => {
    console.log(`[Webhook] Received GitHub event: ${event}`);
    if (['issues', 'pull_request', 'push'].includes(event)) {
        await (0, event_queue_1.enqueue)({
            source: 'github_webhook',
            type: event,
            payload,
        });
        // Trigger an immediate run on high-priority events
        if (event === 'issues' && payload?.action === 'opened') {
            runNAOS().catch(err => console.error('[WebhookTrigger] Run failed:', err));
        }
    }
});
// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
async function main() {
    const cfg = (0, config_1.getConfig)();
    console.log('');
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║   NAOS — Notion Autonomous OS             ║');
    console.log(`║   Mode: ${cfg.DRY_RUN ? 'DRY RUN (safe)         ' : 'LIVE ⚡ (writes enabled) '}  ║`);
    console.log('╚═══════════════════════════════════════════╝');
    console.log('');
    // Verify audit log integrity on startup
    const integrity = audit_log_1.auditLog.verify();
    if (!integrity.valid) {
        console.error(`❌ Audit log integrity check FAILED at line ${integrity.brokenAt}!`);
        process.exit(1);
    }
    console.log('✅ Audit log integrity verified');
    // Start webhook server
    const server = (0, http_1.createServer)((req, res) => {
        handleRequest(req, res).catch(err => {
            console.error('[HTTP] Unhandled error:', err);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error' }));
        });
    });
    server.listen(cfg.WEBHOOK_PORT, () => {
        console.log(`🌐 Webhook server listening on port ${cfg.WEBHOOK_PORT}`);
        console.log(`   POST /run              — manual trigger`);
        console.log(`   POST /webhook/github   — GitHub webhooks`);
        console.log(`   POST /approve          — approve pending task`);
        console.log(`   POST /reject           — reject pending task`);
        console.log(`   GET  /health           — health check`);
    });
    // Start scheduler
    const schedulerTimer = startScheduler(cfg);
    // Run immediately on startup
    console.log('\n🚀 Running initial sync...');
    try {
        await runNAOS();
    }
    catch (err) {
        console.error('Initial run failed:', err);
    }
    // Graceful shutdown
    const shutdown = async (signal) => {
        console.log(`\n${signal} received — shutting down gracefully...`);
        clearInterval(schedulerTimer);
        server.close();
        await (0, event_queue_2.closeRedis)();
        console.log('Goodbye ✓');
        process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', err => {
        console.error('Uncaught exception:', err);
        audit_log_1.auditLog.record({
            agent: 'system',
            action: 'uncaught_exception',
            payload: { message: err.message, stack: err.stack },
            dryRun: cfg.DRY_RUN,
            approved: false,
            outcome: 'failure',
            error: err.message,
        });
    });
    process.on('unhandledRejection', (reason) => {
        console.error('Unhandled rejection:', reason);
    });
}
main().catch(err => {
    console.error('Fatal startup error:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map