# API Contract Guard

## Maintenance Rule

**Keep this file up to date.** When you make changes to the codebase, fix issues, add features, change config, or learn about new issues — update the relevant sections of this CLAUDE.md immediately. If a "Known Issue" gets resolved, remove it. If a new limitation is discovered, add it. If build status changes, reflect it. This file must always reflect the current state of the project.

## Overview

Automated API contract regression testing tool that validates OpenAPI/Swagger specs against live APIs. Dual-mode: **Web UI** (React) for manual testing + **CLI** for CI/CD automation. Tests full CRUD flows (GET > DELETE > POST > GET > COMPARE), discovers real data from APIs, and generates JUnit XML reports.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui (Radix)
- **Backend**: Express.js server (`server/index.ts`) on port 3002
- **CLI**: Commander.js (`src/cli/cli.ts`) - compiles to `dist/cli/cli.js`
- **Auth**: OAuth2 password grant flow
- **CI/CD**: GitHub Actions, CircleCI, Bitbucket Pipelines

## Port Configuration

- **Vite dev server**: port 8002 (not 8080 — 3000/8080 are often taken)
- **Express API server**: port 3002
- Port 3000 is typically occupied on this machine — avoid it

## Project Structure

```
src/
  cli/          # CLI commands (test, test-posts, vm-start, list-endpoints, coverage)
  lib/          # Core logic (swagger parser, tester, comparator, data-discovery)
  components/   # React components + shadcn/ui
  pages/        # React pages (Home, Dashboard, Endpoints, Results)
  types/        # TypeScript type definitions
  hooks/        # React hooks
server/         # Express API server for web UI
.github/        # GitHub Actions workflows
```

## Commands

```bash
npm run dev          # Start server + Vite dev (concurrent)
npm run dev:web      # Vite only (port 8002)
npm run server       # Express server only (port 3002)
npm run build        # Build web UI (Vite)
npm run build:cli    # Build CLI (tsc -p tsconfig.cli.json)
npm run lint         # ESLint
npm run test:api     # Build CLI + run regression tests (needs API credentials)
npm run cli          # Run CLI directly via tsx
```

## Build & Test Status

- **CLI build**: Clean (`strict: true`, `noImplicitAny: true`)
- **Web build**: Clean, code-split (263 kB main chunk)
- **ESLint**: 0 errors (7 warnings from shadcn/ui library patterns — not actionable)
- **npm audit**: 0 high/critical (2 moderate dev-only in esbuild/vite — not exploitable in prod)
- **Last test run**: 64/64 GET endpoints passed (100%), 0 failures, 51 blacklisted

## Remaining Limitations

- **No unit test framework** — No Jest/Vitest. Only integration tests against live APIs. Consider adding Vitest if ongoing maintenance is needed.
- **2 moderate npm vulns** — esbuild/vite dev-server only. Fixing requires Vite 8 major upgrade.
- **v2 API endpoints are expected to be deprecated** — the client is transitioning to v3/v3.1/v3.2/v4. Monitor for 404s on v2 endpoints over time.

## Environment Variables

Required for API testing:
- `API_USERNAME` / `API_PASSWORD` - OAuth2 credentials
- `SWAGGER_URL` - OpenAPI spec endpoint
- `TOKEN_URL` - OAuth2 token endpoint

Optional:
- `NODE_TLS_REJECT_UNAUTHORIZED=0` - Self-signed certs
- `AZURE_*` - Azure VM credentials for auto-start
- `API_PORT=3002` - Server port

## Client Expectations

- **100% pass rate** on all API endpoints (GET, POST, DELETE, etc.) — except endpoints returning 500/503 server errors (those are the API's fault, not the tool's)
- Endpoints with known server-side errors are blacklisted in `src/cli/blacklist.ts`
- The CLI is the **primary interface** — it runs in CI/CD and gates production deploys
- The web UI is a secondary dashboard for manual testing/inspection
- Build output and CI logs must be clean — no warnings, no lint errors, no security vulnerabilities
- CI tests run on **PR creation** and **merge to main** (not on approval). Failures must block deployment.

## Azure VM Schedule

- The dev VM (`vm-pdq-001`) **shuts down automatically at 23:00 every night**
- The CLI auto-starts it if it's down (using Azure Management API credentials in `.env.local`)
- If Azure credentials are missing/invalid, use `--no-auto-start-vm` and start the VM manually in Azure Portal
- The VM typically takes 2-5 minutes to boot and become API-ready
- Scheduled CI tests (GitHub Actions at 08:00 UTC) check availability before running

## Blacklisted Endpoints (51 total)

All defined in `src/cli/blacklist.ts`. Excluded from testing because they have side effects, require manual params, or are broken server-side:

| Category | Count | Examples |
|----------|-------|---------|
| Workload management | 8 | `POST .../claim/workload`, `POST .../start/workload` |
| Schedule state changes | 10 | `POST .../schedule/{sf}/state`, `POST .../restart` |
| Deviations (data fixes) | 6 | `GET .../deviations/badloadings`, `.../danglingrecords/fix` |
| QPI (returns 404) | 5 | `GET /api/v2/qpi`, `GET /api/v2/qpi/settings` |
| Audit operations | 10 | `POST .../audits/{key}/use`, `POST .../audit/sync/definition` |
| Query param required | 10 | `GET .../get/new/hash`, `GET .../schedule/by-time` |
| Copy/migration | 1 | `GET .../copy/from/{from}/to/{to}` |
| API bugs (500) | 1 | `GET /api/v3/ingest/connection` |

## CI/CD Pipelines

### GitHub Actions (`.github/workflows/`)

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `api-tests.yml` | PR, push to main, manual | Readonly GET regression + optional POST fixture tests. Fails on test failure. |
| `scheduled-tests.yml` | Daily 08:00 UTC, manual | Checks API availability first, runs full regression + POST tests. 90-day artifact retention. Optional Slack notification on failure. |

Required GitHub secrets: `SWAGGER_URL`, `TOKEN_URL`, `API_USERNAME`, `API_PASSWORD`

### CircleCI (`.circleci/config.yml`)

| Workflow | Trigger |
|----------|---------|
| `pr-checks` | Pull requests (non-main branches) |
| `merge-checks` | Push to main/master |
| `nightly` | 2 AM UTC daily |

Requires CircleCI context `api-credentials` with `API_USERNAME`, `API_PASSWORD`. Note: CircleCI config has hardcoded Swagger/Token URLs.

### Bitbucket Pipelines (`bitbucket-pipelines.yml`)

Default, main branch, and PR pipelines. Requires repo variables `API_USERNAME`, `API_PASSWORD`.

## Architecture Notes

- CLI and web UI share core lib code (`src/lib/`)
- Web UI communicates with Express server which spawns CLI commands
- Server uses SSE for real-time log streaming
- Blacklisted endpoints defined in `src/cli/blacklist.ts`
- Hierarchical testing supports parent-child API relationships
- Data discovery auto-extracts real IDs from API responses
- JUnit XML output for CI/CD integration
- CLI alias: `gate` (short for api-contract-guard)

## Available Skills

When working in this project, the following skills are available via Claude Code:

| Skill | When to Use |
|-------|-------------|
| `brainstorming` | Before any creative/feature work — explore intent and design first |
| `writing-plans` | After brainstorming, create implementation plans |
| `executing-plans` | Execute written plans with review checkpoints |
| `test-driven-development` | Before writing implementation code |
| `systematic-debugging` | When encountering bugs or unexpected behavior |
| `verification-before-completion` | Before claiming work is done |
| `requesting-code-review` | After completing features, before merging |
| `receiving-code-review` | When handling review feedback |
| `dispatching-parallel-agents` | For 2+ independent tasks |
| `subagent-driven-development` | Execute plans with independent parallel tasks |
| `finishing-a-development-branch` | When implementation is complete |
| `frontend-design` | Building polished web UI components |
| `simplify` | Review changed code for quality and reuse |
| `deploy-to-vercel` | Deploy to Vercel |

## CLI Tools Available

| CLI | Command | Use For |
|-----|---------|---------|
| **Vercel** | `vercel` | Deploy, env vars, inspect deployments |
| **Supabase** | `supabase` | Migrations, types, branches |
| **GitHub** | `gh` | PRs, issues, Actions, CI status |
| **Railway** | `railway` | Deploy, logs, env vars |
| **Port Whisperer** | `ports` | Check what's running, kill orphans |
