import { createHmac, timingSafeEqual } from 'crypto';
import { IncomingMessage, ServerResponse } from 'http';
import { getConfig } from '../../config';

export type WebhookHandler = (event: string, payload: unknown) => Promise<void>;

const handlers: WebhookHandler[] = [];

export function onWebhookEvent(handler: WebhookHandler): void {
  handlers.push(handler);
}

/** Verify GitHub's HMAC-SHA256 signature. */
function verifySignature(body: Buffer, signature: string | undefined): boolean {
  if (!signature) return false;
  const cfg = getConfig();
  const expected = 'sha256=' + createHmac('sha256', cfg.GITHUB_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/** Express-compatible middleware for GitHub webhooks. */
export async function handleGitHubWebhook(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const body = Buffer.concat(chunks);

  const sig = req.headers['x-hub-signature-256'] as string | undefined;
  if (!verifySignature(body, sig)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid signature' }));
    console.warn('[Webhook] Rejected request with invalid signature');
    return;
  }

  const event = req.headers['x-github-event'] as string;
  let payload: unknown;
  try {
    payload = JSON.parse(body.toString('utf-8'));
  } catch {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Invalid JSON' }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ received: true }));

  // Fire handlers asynchronously after responding
  for (const handler of handlers) {
    handler(event, payload).catch(err =>
      console.error(`[Webhook] Handler error for ${event}:`, err),
    );
  }
}
