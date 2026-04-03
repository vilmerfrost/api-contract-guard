# Ship-Ready Polish — Design Spec

**Date:** 2026-04-03
**Goal:** Make API Contract Guard ship-ready for client delivery. CLI must compile, all non-500/503 endpoints must pass, build output must be clean, code quality must be professional.

## Context

This tool gates the client's production deploys. It runs in CI (GitHub Actions / CircleCI / Bitbucket) on every push, executing API contract regression tests. The CLI is the primary interface. The web UI is a secondary dashboard.

**Client expectation:** 100% pass rate on all API endpoints except those with server-side 500/503 errors. Those are blacklisted.

## 1. Create `src/lib/test-fixtures.ts` (BLOCKER)

CLI build fails without this file. Two files import from it:
- `src/cli/orchestrator.ts` — imports `POST_TEST_CASES`, `PostTestCase`, `getTestCasesByModule`, `buildUrl`
- `src/lib/post-endpoint-tester.ts` — imports `PostTestCase`, `buildUrl`

### Exports

```typescript
// Re-export type from types
export { PostTestCase } from '@/types';

// URL builder: "POST /api/v2/systems/{system}" + {system: "X"} → "/api/v2/systems/X"
export function buildUrl(endpoint: string, pathParams: Record<string, string>): string;

// Filter POST_TEST_CASES by module field
export function getTestCasesByModule(moduleName: string): PostTestCase[];

// Predefined test fixtures
export const POST_TEST_CASES: PostTestCase[];
```

### Fixture Modules

Based on `hierarchical-apis.ts` API patterns:

| Module | Endpoint Pattern | Notes |
|--------|-----------------|-------|
| Systems | `POST /api/v2/systems/{system}` | Create/verify/cleanup test system |
| Sourcefiles-v2 | `POST /api/v2/sourcefiles/{sourcefile}` | v2 sourcefile CRUD |
| Sourcefiles-v3 | `POST /api/v3/sourcefiles/{sourcefile}` | v3 sourcefile CRUD |
| Connections | `POST /api/v2/connection/for/{system}` | Connection config |
| Settings | `POST /api/v2/settings` | Settings CRUD |
| Model | `POST /api/v2/model/{mObject}` | Model object CRUD |

Each fixture uses `__test__` prefix in resource names for easy identification and cleanup. Request bodies are minimal valid payloads. Fixtures define `verifyEndpoint` (GET) and `cleanupEndpoint` (DELETE) for the full AUTH → POST → VERIFY → VALIDATE → CLEANUP flow.

## 2. Security & Build Cleanup

- Run `npm audit fix` — resolve 19 vulnerabilities (2 low, 6 moderate, 11 high)
- Run `npx update-browserslist-db@latest` — remove "10 months old" build warning
- Both are non-breaking one-liners

## 3. Fix ESLint Errors (102 errors, 12 warnings)

### Strategy by category

**`@typescript-eslint/no-explicit-any` (majority):**
- `src/types/index.ts` — Define proper types for `parameters`, `requestBody`, `responses`, `data` fields. Use `Record<string, unknown>` or specific shapes where known.
- `src/lib/` files — Type API responses as `Record<string, unknown>`, use type narrowing.
- `src/pages/` — Type event handlers and state properly.
- `src/cli/` — Type Azure API responses, error catches.

**`@typescript-eslint/no-require-imports` (1 error):**
- `tailwind.config.ts` line 120 — Replace `require()` with ESM import or `require` with type annotation.

**`react-hooks/exhaustive-deps` (1 warning):**
- `src/pages/Results.tsx` line 48 — Add `isLiveRunning` and `runTest` to the useEffect dependency array, wrapping `runTest` in `useCallback` if needed.

**Unused eslint-disable directives (2 warnings):**
- `src/lib/utils.ts` lines 22, 27 — Remove the unnecessary `// eslint-disable` comments.

## 4. Code-Split Vite Bundle

Current: 595 kB single JS chunk (warning threshold: 500 kB).

In `src/App.tsx`, lazy-load page components:
```typescript
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Endpoints = React.lazy(() => import('./pages/Endpoints'));
const Results = React.lazy(() => import('./pages/Results'));
```

Wrap routes in `<Suspense>` with a loading fallback. Home page stays eagerly loaded as the entry point.

## 5. TypeScript Strict Mode for CLI

In `tsconfig.cli.json`, change:
- `"strict": false` → `"strict": true`
- `"noImplicitAny": false` → `"noImplicitAny": true`

Then fix resulting type errors in `src/cli/` and `src/lib/` files. This only affects CLI compilation, not the web UI (which uses `tsconfig.app.json`).

## 6. CLI Polish

After all fixes compile, improve CLI output aesthetics:

- **Header banner** — Clean ASCII branding with version number
- **Progress indicators** — Show `[3/61]` style counters during test execution
- **Colored output** — Green for pass, red for fail, yellow for skip/warn, cyan for info
- **Summary table** — Box-drawn table with total/passed/failed/skipped/duration
- **Error details** — Clear formatting for failed endpoints with expected vs actual
- **Exit codes** — 0 for all pass, 1 for any failure (CI integration)

Use chalk or built-in ANSI escape codes (no new dependency if possible — check if chalk is already installed).

## Out of Scope

- Unit test framework (Vitest) — Approach C, not needed for initial ship
- CI/CD consolidation — Client decides which platform they use
- Pre-commit hooks — Nice but not ship-blocking
- Web UI redesign — CLI is primary

## Success Criteria

1. `npm run build:cli` compiles without errors
2. `npm run build` produces no warnings (under 500 kB chunks)
3. `npx eslint .` returns 0 errors
4. `npm audit` shows 0 high/critical vulnerabilities
5. CLI output is clean, professional, and easy to read in CI logs
6. All non-500/503 endpoints pass when run against client API
