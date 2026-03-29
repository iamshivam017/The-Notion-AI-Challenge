import { IncomingMessage, ServerResponse } from 'http';
export type WebhookHandler = (event: string, payload: unknown) => Promise<void>;
export declare function onWebhookEvent(handler: WebhookHandler): void;
/** Express-compatible middleware for GitHub webhooks. */
export declare function handleGitHubWebhook(req: IncomingMessage, res: ServerResponse): Promise<void>;
//# sourceMappingURL=webhook.d.ts.map