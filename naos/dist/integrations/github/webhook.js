"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onWebhookEvent = onWebhookEvent;
exports.handleGitHubWebhook = handleGitHubWebhook;
const crypto_1 = require("crypto");
const config_1 = require("../../config");
const handlers = [];
function onWebhookEvent(handler) {
    handlers.push(handler);
}
/** Verify GitHub's HMAC-SHA256 signature. */
function verifySignature(body, signature) {
    if (!signature)
        return false;
    const cfg = (0, config_1.getConfig)();
    const expected = 'sha256=' + (0, crypto_1.createHmac)('sha256', cfg.GITHUB_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');
    try {
        return (0, crypto_1.timingSafeEqual)(Buffer.from(expected), Buffer.from(signature));
    }
    catch {
        return false;
    }
}
/** Express-compatible middleware for GitHub webhooks. */
async function handleGitHubWebhook(req, res) {
    const chunks = [];
    for await (const chunk of req)
        chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const sig = req.headers['x-hub-signature-256'];
    if (!verifySignature(body, sig)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid signature' }));
        console.warn('[Webhook] Rejected request with invalid signature');
        return;
    }
    const event = req.headers['x-github-event'];
    let payload;
    try {
        payload = JSON.parse(body.toString('utf-8'));
    }
    catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ received: true }));
    // Fire handlers asynchronously after responding
    for (const handler of handlers) {
        handler(event, payload).catch(err => console.error(`[Webhook] Handler error for ${event}:`, err));
    }
}
//# sourceMappingURL=webhook.js.map