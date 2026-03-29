# NAOS — Notion Autonomous Operating System

A production-grade multi-agent system that integrates Notion + GitHub, builds unified context, and autonomously executes workspace improvement tasks — with a self-improvement loop that learns from every run.

---

## Architecture

```
Data Sources (Notion API, GitHub API, Webhooks)
        ↓
Context Engine (Unified Context Builder + Cache + Diff Engine)
        ↓
Master Orchestrator Agent
        ↓
Specialist Agents:
  • Task Generator   — converts context → actionable tasks (via Claude)
  • Prioritizer      — multi-factor urgency scoring
  • Reviewer         — LLM quality gate (fail-closed)
  • Executor         — runs approved actions with full audit trail
  • Self-Improver    — analyzes outcomes, updates semantic memory
        ↓
Tool Layer (Notion tools, GitHub tools)
        ↓
Output + Safety (Audit Log, Dry-run, Human Gate, Notifier)
```

The Self-Improver feeds back into the system — it persists learned refinements to the task generator's system prompt, prioritizer weights, and workspace context via semantic memory. NAOS gets smarter every run.

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in your Notion, GitHub, and Anthropic credentials
```

### 3. Start Redis (required for event queue)

```bash
docker-compose up redis -d
```

### 4. Run in dry-run mode (safe — no writes)

```bash
DRY_RUN=true npm run dev
```

### 5. Run simulation (no real API calls needed for task generation logic)

```bash
npm run test:sim
```

### 6. Run tests

```bash
npm test
```

### 7. Production deployment

```bash
docker-compose up --build
```

---

## Safety Features

| Feature | Description |
|---|---|
| **Dry-run mode** | `DRY_RUN=true` (default) — all writes are logged but not executed |
| **Human gate** | `REQUIRE_HUMAN_APPROVAL=true` (default) — tasks require explicit approval |
| **Reviewer agent** | LLM quality gate rejects unsafe or duplicate tasks (fail-closed) |
| **Audit log** | Append-only SHA-256 hash-chain log — tamper-evident |
| **Rate limiters** | Token-bucket per API — respects Notion (3/s), GitHub (30/min), Claude limits |
| **Retry logic** | Exponential backoff on 429/5xx; bails on 4xx client errors |
| **Concurrency limit** | `MAX_CONCURRENT_AGENTS` (default 3) — prevents API hammering |

---

## Configuration

See `.env.example` for all options. Key settings:

| Variable | Default | Description |
|---|---|---|
| `DRY_RUN` | `true` | Safe mode — log actions but don't execute |
| `REQUIRE_HUMAN_APPROVAL` | `true` | Gate tasks behind human approval |
| `MAX_ACTIONS_PER_RUN` | `10` | Max tasks executed per run |
| `CONTEXT_CACHE_TTL_SECONDS` | `300` | How long to cache workspace context |
| `RUN_CRON` | `*/30 * * * *` | How often to run autonomously |

---

## HTTP Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/run` | Trigger a manual run |
| `POST` | `/webhook/github` | GitHub webhook receiver |
| `POST` | `/approve` | Approve a pending task `{ taskId }` |
| `POST` | `/reject` | Reject a pending task `{ taskId }` |
| `GET` | `/health` | Health check + audit log integrity |

---

## Self-Improvement Loop

After every run, `SelfImproverAgent` analyzes outcomes and persists:
- Additional rules to the task generator's system prompt
- Adjusted scoring weights to the prioritizer
- Learned workspace context for future runs

All improvements are stored in `naos-memory.json` and loaded on the next run. The system's effectiveness compounds over time.

---

## Project Structure

```
src/
├── agents/           # Orchestrator, TaskGenerator, Prioritizer, Reviewer, Executor, SelfImprover
├── context/          # UnifiedContext builder, diff engine, vector store
├── integrations/
│   ├── notion/       # Client, sync, tools, webhook
│   └── github/       # Client, sync, tools, webhook
├── safety/           # Audit log, rate limiter, dry-run, human gate
├── queue/            # Redis event queue, priority task queue
├── memory/           # Episodic (in-run) and semantic (persistent) memory
└── config/           # Env-validated configuration
```

---

## License

MIT
