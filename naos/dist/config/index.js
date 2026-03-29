"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
exports._resetConfig = _resetConfig;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Schema — every field validated at startup; process exits on missing values
// ---------------------------------------------------------------------------
const ConfigSchema = zod_1.z.object({
    // Notion
    NOTION_API_KEY: zod_1.z.string().min(1, 'NOTION_API_KEY is required'),
    NOTION_WORKSPACE_ID: zod_1.z.string().min(1, 'NOTION_WORKSPACE_ID is required'),
    NOTION_DATABASE_IDS: zod_1.z
        .string()
        .min(1)
        .transform(s => s.split(',').map(id => id.trim()).filter(Boolean)),
    // GitHub
    GITHUB_TOKEN: zod_1.z.string().min(1, 'GITHUB_TOKEN is required'),
    GITHUB_OWNER: zod_1.z.string().min(1, 'GITHUB_OWNER is required'),
    GITHUB_REPO: zod_1.z.string().min(1, 'GITHUB_REPO is required'),
    GITHUB_WEBHOOK_SECRET: zod_1.z
        .string()
        .min(32, 'GITHUB_WEBHOOK_SECRET must be ≥32 chars'),
    // Anthropic
    ANTHROPIC_API_KEY: zod_1.z
        .string()
        .startsWith('sk-ant-', 'ANTHROPIC_API_KEY must start with sk-ant-'),
    ANTHROPIC_MODEL: zod_1.z.string().default('claude-opus-4-5'),
    // Redis
    REDIS_URL: zod_1.z.string().url('REDIS_URL must be a valid URL'),
    // Safety — conservative defaults
    DRY_RUN: zod_1.z.coerce.boolean().default(true),
    REQUIRE_HUMAN_APPROVAL: zod_1.z.coerce.boolean().default(true),
    MAX_ACTIONS_PER_RUN: zod_1.z.coerce.number().int().min(1).max(50).default(10),
    HUMAN_APPROVAL_WEBHOOK: zod_1.z.string().url().optional(),
    // Performance
    CONTEXT_CACHE_TTL_SECONDS: zod_1.z.coerce.number().int().min(30).default(300),
    MAX_CONCURRENT_AGENTS: zod_1.z.coerce.number().int().min(1).max(10).default(3),
    API_TIMEOUT_MS: zod_1.z.coerce.number().int().default(30_000),
    // Scheduling
    RUN_CRON: zod_1.z.string().default('*/30 * * * *'),
    WEBHOOK_PORT: zod_1.z.coerce.number().int().default(3000),
});
let _config = null;
function getConfig() {
    if (_config)
        return _config;
    const result = ConfigSchema.safeParse(process.env);
    if (!result.success) {
        const issues = result.error.issues.map(i => `  • ${i.path.join('.')}: ${i.message}`);
        console.error('❌ Configuration errors:\n' + issues.join('\n'));
        process.exit(1);
    }
    _config = result.data;
    return _config;
}
// Allow overriding in tests
function _resetConfig() {
    _config = null;
}
//# sourceMappingURL=index.js.map