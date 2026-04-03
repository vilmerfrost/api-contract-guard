# Ship-Ready Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make API Contract Guard compile, pass lint, and produce clean professional CLI output — ready to ship to client.

**Architecture:** Fix the missing test-fixtures file (CLI build blocker), update ports to 3002/8002, resolve all ESLint errors, code-split the Vite bundle, enable strict TypeScript for CLI, and polish CLI output with colored formatting.

**Tech Stack:** TypeScript, React 18, Vite, Commander.js, Express, Tailwind CSS

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/lib/test-fixtures.ts` | POST test fixture data, URL builder, module filter |
| Modify | `vite.config.ts` | Port 8080 → 8002 |
| Modify | `server/index.ts:296` | Default port 3001 → 3002 |
| Modify | `src/lib/cli-api.ts:3` | API base URL 3001 → 3002 |
| Modify | `src/types/index.ts` | Replace `any` with proper types |
| Modify | `src/lib/utils.ts:22-27` | Remove unused eslint-disable directives |
| Modify | `tailwind.config.ts:120` | Replace `require()` with ESM-compatible pattern |
| Modify | `src/pages/Results.tsx:43-48` | Fix useEffect dependency array |
| Modify | `src/pages/Home.tsx` | Replace `any` types |
| Modify | `src/pages/Endpoints.tsx:44` | Replace `any` type |
| Modify | `src/pages/Dashboard.tsx` | Replace `any` types |
| Modify | `src/cli/azure-starter.ts` | Replace `any` types |
| Modify | `src/lib/tester.ts` | Replace `any` types |
| Modify | `src/lib/comparator.ts` | Replace `any` types |
| Modify | `src/lib/data-discovery.ts` | Replace `any` types |
| Modify | `src/lib/post-endpoint-tester.ts` | Replace `any` types |
| Modify | `src/cli/cli.ts` | Replace `any` types |
| Modify | `src/cli/orchestrator.ts` | Replace `any` types |
| Modify | `src/cli/blacklist.ts` | Replace `any` types (if applicable) |
| Modify | `src/cli/junit-reporter.ts` | Replace `any` types (if applicable) |
| Modify | `src/cli/coverage-analyzer.ts` | Replace `any` types (if applicable) |
| Modify | `src/App.tsx` | Code-split with React.lazy |
| Modify | `tsconfig.cli.json` | Enable strict mode |
| Modify | `eslint.config.js` | (if needed for rule adjustments) |

---

### Task 1: Create `src/lib/test-fixtures.ts`

**Files:**
- Create: `src/lib/test-fixtures.ts`

This is the CLI build blocker. Without this file, `npm run build:cli` fails.

- [ ] **Step 1: Create the test-fixtures file with buildUrl, getTestCasesByModule, and POST_TEST_CASES**

```typescript
/**
 * POST Endpoint Test Fixtures
 *
 * Predefined test data for POST endpoint regression testing.
 * Each fixture defines the full flow: AUTH → POST → VERIFY → VALIDATE → CLEANUP
 */

import { PostTestCase } from '../types/index.js';

// Re-export for convenience
export type { PostTestCase } from '../types/index.js';

/**
 * Build a URL from an endpoint pattern and path parameters.
 * e.g. buildUrl("POST /api/v2/systems/{system}", { system: "Test" }) → "/api/v2/systems/Test"
 */
export function buildUrl(endpoint: string, pathParams: Record<string, string>): string {
  // Strip HTTP method prefix if present (e.g. "POST /api/v2/..." → "/api/v2/...")
  let url = endpoint.includes(' ') ? endpoint.split(' ').slice(1).join(' ') : endpoint;

  // Substitute path parameters
  for (const [key, value] of Object.entries(pathParams)) {
    url = url.replace(`{${key}}`, encodeURIComponent(value));
  }

  return url;
}

/**
 * Filter test cases by module name (case-insensitive).
 */
export function getTestCasesByModule(moduleName: string): PostTestCase[] {
  return POST_TEST_CASES.filter(
    (tc) => tc.module.toLowerCase() === moduleName.toLowerCase()
  );
}

/**
 * Predefined POST test cases grouped by module.
 * Uses __test__ prefix in resource names for easy identification and cleanup.
 *
 * The client's API discovers real data via data-discovery.ts for GET tests.
 * These fixtures are specifically for POST endpoint regression testing —
 * they create, verify, and clean up test resources.
 */
export const POST_TEST_CASES: PostTestCase[] = [
  // ============================================
  // MODULE: Systems
  // ============================================
  {
    endpoint: 'POST /api/v2/systems/{system}',
    description: 'Create a test system via v2 API',
    pathParams: { system: '__test__system' },
    requestBody: {
      system: '__test__system',
      description: 'Automated test system - safe to delete',
    },
    expectedStatus: 200,
    verifyEndpoint: 'GET /api/v2/systems/{system}',
    cleanupEndpoint: 'DELETE /api/v2/systems/{system}',
    priority: 1,
    module: 'Systems',
  },

  // ============================================
  // MODULE: Sourcefiles-v2
  // ============================================
  {
    endpoint: 'POST /api/v2/sourcefiles/{sourcefile}',
    description: 'Create a test sourcefile via v2 API',
    pathParams: { sourcefile: '__test__sourcefile_v2' },
    requestBody: {
      sourceFilename: '__test__sourcefile_v2',
      description: 'Automated test sourcefile v2 - safe to delete',
      system: '__test__system',
    },
    expectedStatus: 200,
    verifyEndpoint: 'GET /api/v2/sourcefiles/{sourcefile}',
    cleanupEndpoint: 'DELETE /api/v2/sourcefiles/{sourcefile}',
    dependsOn: ['POST /api/v2/systems/{system}'],
    priority: 2,
    module: 'Sourcefiles-v2',
  },

  // ============================================
  // MODULE: Sourcefiles-v3
  // ============================================
  {
    endpoint: 'POST /api/v3/sourcefiles/{sourcefile}',
    description: 'Create a test sourcefile via v3 API',
    pathParams: { sourcefile: '__test__sourcefile_v3' },
    requestBody: {
      sourceFilename: '__test__sourcefile_v3',
      description: 'Automated test sourcefile v3 - safe to delete',
      system: '__test__system',
    },
    expectedStatus: 200,
    verifyEndpoint: 'GET /api/v3/sourcefiles/{sourcefile}',
    cleanupEndpoint: 'DELETE /api/v3/sourcefiles/{sourcefile}',
    dependsOn: ['POST /api/v2/systems/{system}'],
    priority: 2,
    module: 'Sourcefiles-v3',
  },

  // ============================================
  // MODULE: Connections
  // ============================================
  {
    endpoint: 'POST /api/v2/connection/for/{system}',
    description: 'Create a connection config for test system',
    pathParams: { system: '__test__system' },
    requestBody: {
      system: '__test__system',
      connectionType: 'database',
      description: 'Automated test connection - safe to delete',
    },
    expectedStatus: 200,
    verifyEndpoint: 'GET /api/v2/connection/for/{system}',
    cleanupEndpoint: 'DELETE /api/v2/connection/for/{system}',
    dependsOn: ['POST /api/v2/systems/{system}'],
    priority: 3,
    module: 'Connections',
  },

  // ============================================
  // MODULE: Settings
  // ============================================
  {
    endpoint: 'POST /api/v2/settings',
    description: 'Create a test setting',
    pathParams: {},
    requestBody: {
      key: '__test__setting',
      value: 'automated-test-value',
      description: 'Automated test setting - safe to delete',
    },
    expectedStatus: 200,
    verifyEndpoint: 'GET /api/v2/settings',
    cleanupEndpoint: 'DELETE /api/v2/settings/__test__setting',
    priority: 1,
    module: 'Settings',
  },

  // ============================================
  // MODULE: Model
  // ============================================
  {
    endpoint: 'POST /api/v2/model/{mObject}',
    description: 'Create a test model object',
    pathParams: { mObject: '__test__model_obj' },
    requestBody: {
      name: '__test__model_obj',
      description: 'Automated test model object - safe to delete',
    },
    expectedStatus: 200,
    verifyEndpoint: 'GET /api/v2/model/{mObject}',
    cleanupEndpoint: 'DELETE /api/v2/model/{mObject}',
    priority: 1,
    module: 'Model',
  },
];
```

- [ ] **Step 2: Verify CLI compiles**

Run: `npx tsc -p tsconfig.cli.json 2>&1`
Expected: No errors (clean compilation)

- [ ] **Step 3: Commit**

```bash
git add src/lib/test-fixtures.ts
git commit -m "feat: add POST test fixtures — unblocks CLI build"
```

---

### Task 2: Update Ports to 3002/8002

**Files:**
- Modify: `vite.config.ts:9` (port 8080 → 8002)
- Modify: `server/index.ts:296` (port 3001 → 3002)
- Modify: `src/lib/cli-api.ts:3` (API base URL 3001 → 3002)

- [ ] **Step 1: Update Vite dev server port**

In `vite.config.ts`, change:
```typescript
// old
port: 8080,
// new
port: 8002,
```

- [ ] **Step 2: Update Express server default port**

In `server/index.ts` line 296, change:
```typescript
// old
const PORT = process.env.API_PORT || 3001;
// new
const PORT = process.env.API_PORT || 3002;
```

- [ ] **Step 3: Update CLI API base URL**

In `src/lib/cli-api.ts` line 3, change:
```typescript
// old
const API_BASE = 'http://localhost:3001';
// new
const API_BASE = 'http://localhost:3002';
```

- [ ] **Step 4: Verify dev server starts on correct port**

Run: `npx vite --port 8002 2>&1 | head -5` (Ctrl-C after confirming port)
Expected: Output shows `localhost:8002`

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts server/index.ts src/lib/cli-api.ts
git commit -m "fix: update ports to 3002/8002 to avoid conflicts"
```

---

### Task 3: Security & Build Cleanup

**Files:** `package.json` (indirect via npm), `package-lock.json` (auto-updated)

- [ ] **Step 1: Fix npm audit vulnerabilities**

Run: `npm audit fix 2>&1`
Expected: Vulnerabilities resolved (some may remain if they require breaking changes)

- [ ] **Step 2: Update browserslist database**

Run: `npx update-browserslist-db@latest 2>&1`
Expected: "caniuse-lite has been successfully updated"

- [ ] **Step 3: Verify build is clean**

Run: `npx vite build 2>&1 | tail -10`
Expected: No "browserslist data is X months old" warning

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "fix: resolve npm audit vulnerabilities and update browserslist"
```

---

### Task 4: Fix ESLint Errors — Types File

**Files:**
- Modify: `src/types/index.ts`

This is the foundation — other files import these types. Fix `any` here first.

- [ ] **Step 1: Replace `any` with proper types in `src/types/index.ts`**

```typescript
export interface SwaggerConfig {
  url: string;
  auth?: AuthConfig;
}

export interface AuthConfig {
  type: 'none' | 'bearer' | 'apikey' | 'oauth2';
  token?: string;
  username?: string;
  password?: string;
  tokenUrl?: string;
}

export interface Endpoint {
  path: string;
  method: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';
  summary?: string;
  parameters?: Record<string, unknown>[];
  requestBody?: Record<string, unknown>;
  responses?: Record<string, unknown>;
  operationId?: string;
}

export interface EndpointGroup {
  resource: string;
  endpoints: Endpoint[];
}

export interface TestStep {
  step: 'AUTH' | 'GET' | 'DELETE' | 'POST' | 'VERIFY' | 'COMPARE' | 'VALIDATE' | 'CLEANUP';
  method?: string;
  url?: string;
  status?: number;
  data?: unknown;
  error?: string;
  timestamp: Date;
}

/**
 * POST endpoint test case configuration
 * Defines predefined test data for POST endpoint testing
 */
export interface PostTestCase {
  /** Endpoint pattern, e.g., "POST /api/v2/systems/{system}" */
  endpoint: string;
  /** Human-readable description */
  description: string;
  /** Path parameter values, e.g., { system: "TestSystem" } */
  pathParams: Record<string, string>;
  /** Request body to send */
  requestBody: Record<string, unknown>;
  /** Expected HTTP status code */
  expectedStatus: number;
  /** Optional function to validate response */
  validateResponse?: (response: unknown) => boolean;
  /** GET endpoint to verify creation (with path params substituted) */
  verifyEndpoint?: string;
  /** DELETE endpoint for cleanup (with path params substituted) */
  cleanupEndpoint?: string;
  /** Body for DELETE request if needed */
  cleanupBody?: Record<string, unknown>;
  /** Dependencies - other test cases that must run first */
  dependsOn?: string[];
  /** Priority for ordering (lower = earlier) */
  priority?: number;
  /** Module/category for grouping */
  module: string;
}

export interface TestResult {
  resource: string;
  steps: TestStep[];
  passed: boolean;
  differences?: Difference[];
  duration: number;
}

export interface Difference {
  path: string;
  expected: unknown;
  actual: unknown;
  type: 'added' | 'removed' | 'changed';
}

export interface AppState {
  swaggerUrl: string;
  baseUrl: string;
  auth: AuthConfig;
  endpointGroups: EndpointGroup[];
  testResults: Map<string, TestResult>;
}
```

- [ ] **Step 2: Run ESLint on types file**

Run: `npx eslint src/types/index.ts 2>&1`
Expected: 0 errors

- [ ] **Step 3: Verify CLI still compiles**

Run: `npx tsc -p tsconfig.cli.json 2>&1`
Expected: No errors (the type changes from `any` to `unknown`/`Record` may cause downstream errors — those get fixed in later tasks)

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "fix: replace any types with proper types in type definitions"
```

---

### Task 5: Fix ESLint Errors — CLI & Lib Files

**Files:**
- Modify: `src/cli/azure-starter.ts`
- Modify: `src/cli/cli.ts`
- Modify: `src/cli/orchestrator.ts`
- Modify: `src/cli/blacklist.ts`
- Modify: `src/cli/junit-reporter.ts`
- Modify: `src/cli/coverage-analyzer.ts`
- Modify: `src/lib/tester.ts`
- Modify: `src/lib/comparator.ts`
- Modify: `src/lib/data-discovery.ts`
- Modify: `src/lib/post-endpoint-tester.ts`
- Modify: `src/lib/utils.ts`

- [ ] **Step 1: Run ESLint on CLI/lib files to see exact errors**

Run: `npx eslint src/cli/ src/lib/ 2>&1`
Expected: List of `no-explicit-any` errors with line numbers

- [ ] **Step 2: Fix all `any` types in CLI and lib files**

Strategy for each file:
- Error catch blocks: `catch (error: unknown)` then use `(error as Error).message` or type guard `if (error instanceof Error)`
- API response data: `Record<string, unknown>` or specific shapes
- Function parameters with known shapes: define inline types or use existing interfaces
- Genuinely dynamic data (JSON parse, API responses): `unknown` with type narrowing

- [ ] **Step 3: Remove unused eslint-disable directives in `src/lib/utils.ts`**

In `src/lib/utils.ts`, the eslint warnings say lines 22 and 27 have unused directives. Check if the `require` calls still exist — if they do, the directives are needed (the warning may be about the specific rule name). If the `require` calls are gone, remove the comments. If the `require` calls are present but the rule isn't triggered, the directives are stale — remove them.

- [ ] **Step 4: Run ESLint on CLI/lib files**

Run: `npx eslint src/cli/ src/lib/ 2>&1`
Expected: 0 errors, 0 warnings

- [ ] **Step 5: Verify CLI still compiles**

Run: `npx tsc -p tsconfig.cli.json 2>&1`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/cli/ src/lib/
git commit -m "fix: resolve all ESLint errors in CLI and lib files"
```

---

### Task 6: Fix ESLint Errors — Frontend Files

**Files:**
- Modify: `src/pages/Home.tsx` (lines 24, 83, 192)
- Modify: `src/pages/Endpoints.tsx` (line 44)
- Modify: `src/pages/Dashboard.tsx` (lines 129, 131, 149)
- Modify: `src/pages/Results.tsx` (lines 48, 63)
- Modify: `tailwind.config.ts` (line 120)

- [ ] **Step 1: Run ESLint on frontend files to see exact errors**

Run: `npx eslint src/pages/ tailwind.config.ts 2>&1`
Expected: List of errors with line numbers

- [ ] **Step 2: Fix `any` types in page files**

For each page file, replace `any` with proper types:
- Event handlers: use React event types (`React.ChangeEvent<HTMLInputElement>`, etc.)
- State: use existing interfaces from `src/types/index.ts`
- API responses: `unknown` with narrowing
- Error catches: `unknown` with `instanceof Error` guard

- [ ] **Step 3: Fix useEffect dependency array in `src/pages/Results.tsx`**

At line 43-48, the useEffect references `isLiveRunning` and calls `runTest()` but neither is in the deps array. Fix by wrapping `runTest` in `useCallback` and adding both to deps:

```typescript
const runTest = useCallback(async () => {
  if (!group) return;
  setIsLiveRunning(true);
  setLiveSteps([]);
  try {
    const testResult = await runEndpointTest(baseUrl, group, auth, (step) => {
      setLiveSteps(prev => [...prev, step]);
    });
    onTestComplete(group.resource, testResult);
  } catch (error: unknown) {
    console.error('Test failed:', error instanceof Error ? error.message : error);
  } finally {
    setIsLiveRunning(false);
  }
}, [group, baseUrl, auth, onTestComplete]);

useEffect(() => {
  if (group && !result && !isLiveRunning) {
    runTest();
  }
}, [group, result, isLiveRunning, runTest]);
```

Note: will need to add `useCallback` to the React import at top of file.

- [ ] **Step 4: Fix `require()` in `tailwind.config.ts`**

At line 120, change:
```typescript
// old
plugins: [require("tailwindcss-animate")],
// new
plugins: [await import("tailwindcss-animate").then(m => m.default)],
```

If that causes issues with Tailwind's config loader, alternative approach — add an eslint override for this single file:

In `eslint.config.js`, add an override block:
```javascript
{
  files: ["tailwind.config.ts"],
  rules: {
    "@typescript-eslint/no-require-imports": "off",
  },
},
```

- [ ] **Step 5: Run full ESLint**

Run: `npx eslint . 2>&1`
Expected: 0 errors, 0 warnings (or only non-actionable warnings)

- [ ] **Step 6: Verify web build still works**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add src/pages/ tailwind.config.ts eslint.config.js
git commit -m "fix: resolve all ESLint errors in frontend files"
```

---

### Task 7: Code-Split Vite Bundle

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add React.lazy imports and Suspense wrapper**

Replace the top of `src/App.tsx`:

```typescript
import { useState, lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import { EndpointGroup, TestResult, AuthConfig } from "./types";

// Lazy-loaded pages (code splitting)
const Endpoints = lazy(() => import("./pages/Endpoints"));
const Results = lazy(() => import("./pages/Results"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
```

Then wrap the `<Routes>` block in `<Suspense>`:

```typescript
<BrowserRouter>
  <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading...</div>}>
    <Routes>
      {/* ...existing routes unchanged... */}
    </Routes>
  </Suspense>
</BrowserRouter>
```

- [ ] **Step 2: Verify build produces smaller chunks**

Run: `npx vite build 2>&1 | tail -15`
Expected: Multiple JS chunks, main chunk under 500 kB, no size warning

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "perf: code-split page components to reduce bundle size"
```

---

### Task 8: Enable Strict TypeScript for CLI

**Files:**
- Modify: `tsconfig.cli.json`
- Modify: various `src/cli/` and `src/lib/` files (as needed for strict errors)

- [ ] **Step 1: Enable strict mode**

In `tsconfig.cli.json`, change:
```json
"strict": true,
"noImplicitAny": true,
```

- [ ] **Step 2: Attempt CLI build and capture errors**

Run: `npx tsc -p tsconfig.cli.json 2>&1`
Expected: Type errors from strict mode (implicit any, possibly null checks)

- [ ] **Step 3: Fix all strict mode type errors**

Common fixes:
- Add explicit types to function parameters that were implicitly `any`
- Add null checks where strict null checks flag potential `undefined`
- Add return types to functions where inference isn't clear
- Use type assertions only when the type is genuinely known but TypeScript can't infer it

- [ ] **Step 4: Verify clean CLI build**

Run: `npx tsc -p tsconfig.cli.json 2>&1`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add tsconfig.cli.json src/cli/ src/lib/
git commit -m "fix: enable strict TypeScript for CLI — catches real bugs"
```

---

### Task 9: CLI Output Polish

**Files:**
- Modify: `src/cli/cli.ts`
- Modify: `src/cli/orchestrator.ts`

No new dependencies — use ANSI escape codes directly (chalk is not installed and we keep deps minimal for a CLI that runs in CI).

- [ ] **Step 1: Add a CLI formatting utility at the top of `src/cli/cli.ts`**

Add after the existing imports:

```typescript
// ANSI color helpers (no external deps — works in all CI environments)
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
};

function banner(): void {
  console.log(`
${c.cyan}${c.bold}  ╔══════════════════════════════════════════════════════╗
  ║          API Contract Guard  v1.0.0                  ║
  ║          Automated API Regression Testing            ║
  ╚══════════════════════════════════════════════════════╝${c.reset}
`);
}

function pass(msg: string): void {
  console.log(`  ${c.green}✓${c.reset} ${msg}`);
}

function fail(msg: string): void {
  console.log(`  ${c.red}✗${c.reset} ${msg}`);
}

function skip(msg: string): void {
  console.log(`  ${c.yellow}○${c.reset} ${c.dim}${msg}${c.reset}`);
}

function info(msg: string): void {
  console.log(`  ${c.cyan}ℹ${c.reset} ${msg}`);
}

function heading(msg: string): void {
  console.log(`\n${c.bold}${c.white}  ${msg}${c.reset}`);
  console.log(`  ${'─'.repeat(msg.length)}`);
}

function summaryTable(total: number, passed: number, failed: number, skipped: number, duration: number): void {
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
  const dur = (duration / 1000).toFixed(1);
  const status = failed === 0 ? `${c.bgGreen}${c.bold} PASS ${c.reset}` : `${c.bgRed}${c.bold} FAIL ${c.reset}`;

  console.log(`
  ${c.bold}┌─────────────────────────────────────────┐${c.reset}
  ${c.bold}│${c.reset}  ${status}  ${passRate}% pass rate  (${dur}s)       ${c.bold}│${c.reset}
  ${c.bold}├─────────────────────────────────────────┤${c.reset}
  ${c.bold}│${c.reset}  ${c.green}Passed:${c.reset}  ${String(passed).padStart(4)}                          ${c.bold}│${c.reset}
  ${c.bold}│${c.reset}  ${c.red}Failed:${c.reset}  ${String(failed).padStart(4)}                          ${c.bold}│${c.reset}
  ${c.bold}│${c.reset}  ${c.yellow}Skipped:${c.reset} ${String(skipped).padStart(4)}                          ${c.bold}│${c.reset}
  ${c.bold}│${c.reset}  ${c.cyan}Total:${c.reset}   ${String(total).padStart(4)}                          ${c.bold}│${c.reset}
  ${c.bold}└─────────────────────────────────────────┘${c.reset}
`);
}
```

- [ ] **Step 2: Add banner call to the `test` command action**

In the `test` command's action handler (in `cli.ts`), add `banner();` as the first line before any test logic runs.

- [ ] **Step 3: Update orchestrator progress output**

In `src/cli/orchestrator.ts`, update the test execution loop to show progress counters:

Replace plain `console.log` calls for test results with formatted output using the ANSI helpers. Export the `c`, `pass`, `fail`, `skip`, `info`, `heading`, and `summaryTable` helpers from `cli.ts` or extract them into a shared `src/cli/format.ts` file that both `cli.ts` and `orchestrator.ts` import.

Key changes:
- Show `[3/61]` progress counter before each endpoint test
- Use `pass()` for successful tests, `fail()` for failures, `skip()` for blacklisted
- Use `heading()` for section headers (e.g. "GET Endpoint Tests", "POST Endpoint Tests")
- Use `summaryTable()` at the end of test runs
- Show `info()` for configuration details (swagger URL, auth type, mode)

- [ ] **Step 4: Verify CLI output looks correct**

Run: `node dist/cli/cli.js --help 2>&1`
Expected: Clean commander help output

Run: `node dist/cli/cli.js test --help 2>&1`
Expected: All options listed cleanly

- [ ] **Step 5: Verify full build**

Run: `npx tsc -p tsconfig.cli.json 2>&1`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/cli/
git commit -m "feat: polish CLI output with colored formatting and summary tables"
```

---

### Task 10: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Full CLI build**

Run: `npx tsc -p tsconfig.cli.json 2>&1`
Expected: 0 errors

- [ ] **Step 2: Full web build**

Run: `npx vite build 2>&1`
Expected: No warnings, chunks under 500 kB

- [ ] **Step 3: Full ESLint pass**

Run: `npx eslint . 2>&1`
Expected: 0 errors

- [ ] **Step 4: npm audit check**

Run: `npm audit 2>&1 | tail -5`
Expected: 0 high/critical vulnerabilities

- [ ] **Step 5: CLI help renders correctly**

Run: `node dist/cli/cli.js --help 2>&1`
Expected: Clean output with version and all commands listed

- [ ] **Step 6: Commit any remaining fixes, then tag release**

```bash
git add -A
git commit -m "chore: final verification — ship-ready"
```
