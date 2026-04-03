# API Contract Guard

Automated API contract regression testing tool. Validates OpenAPI/Swagger specs against live APIs to catch breaking changes before production.

## What It Does

Runs full CRUD regression tests against your API endpoints:

1. **GET** - Fetch existing resource data
2. **DELETE** - Remove the resource
3. **POST** - Recreate with the same data (minus metadata)
4. **VERIFY** - Fetch the newly created resource
5. **COMPARE** - Deep compare original vs recreated

If anything changed, the test fails and blocks the deploy.

## Quick Start

```bash
# Install dependencies
npm install

# Build the CLI
npm run build:cli

# Run regression tests
node dist/cli/cli.js test \
  --swagger-url <openapi-json-url> \
  --token-url <oauth2-token-url> \
  --username $API_USERNAME \
  --password $API_PASSWORD \
  --mode readonly \
  --use-real-data \
  --parallel
```

Or use the env loader:

```bash
source load-env.sh    # Loads .env.local and validates credentials
npm run test:api      # Builds CLI + runs tests
```

## CLI Commands

### `test` - Run API regression tests

```bash
api-contract-guard test [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--swagger-url <url>` | OpenAPI/Swagger JSON URL | required |
| `--token-url <url>` | OAuth2 token endpoint | required |
| `--username <user>` | OAuth2 username (or `API_USERNAME` env) | required |
| `--password <pass>` | OAuth2 password (or `API_PASSWORD` env) | required |
| `--output <file>` | JUnit XML output path | `junit.xml` |
| `--mode <mode>` | `full` (CRUD) or `readonly` (GET only) | `full` |
| `--parallel` | Run tests concurrently | `false` |
| `--max-parallel <n>` | Max concurrent tests | `5` |
| `--use-real-data` | Discover real IDs from API | `false` |
| `--use-hierarchical` | Test parent-child API relationships | `false` |
| `--no-auto-start-vm` | Don't auto-start Azure VM | - |
| `--test-posts` | Include POST fixture tests | `false` |
| `--skip-cleanup` | Skip cleanup in POST tests | `false` |

### `test-posts` - Run POST endpoint tests

```bash
api-contract-guard test-posts [options]
```

Tests POST endpoints with predefined fixtures (AUTH > POST > VERIFY > VALIDATE > CLEANUP).

| Option | Description | Default |
|--------|-------------|---------|
| `--swagger-url <url>` | OpenAPI JSON URL | required |
| `--token-url <url>` | OAuth2 token endpoint | required |
| `--username <user>` | OAuth2 username | required |
| `--password <pass>` | OAuth2 password | required |
| `--output <file>` | JUnit XML output path | `junit-posts.xml` |
| `--module <name>` | Run only a specific module | all |
| `--skip-cleanup` | Skip cleanup after tests | `false` |
| `--skip-verify` | Skip verification after POST | `false` |

Available modules: `Systems`, `Sourcefiles-v2`, `Sourcefiles-v3`, `Connections`, `Settings`, `Model`

### `list-endpoints` - List testable endpoints

```bash
api-contract-guard list-endpoints --swagger-url <url> [--include-blacklisted] [--show-full-urls]
```

### `coverage` - Generate API coverage report

```bash
api-contract-guard coverage \
  --swagger-url <url> \
  --test-results junit.xml \
  --format both    # console, markdown, or both
```

### `vm-start` - Start Azure VM

```bash
api-contract-guard vm-start --api-url <url> [--max-wait 300]
```

### `get` - Export environment variables

```bash
api-contract-guard get --file .env.local
```

## Environment Variables

Create a `.env.local` file:

```bash
# Required
API_USERNAME=your_username
API_PASSWORD=your_password
SWAGGER_URL=https://your-api.com/openapi.json
TOKEN_URL=https://your-api.com/token

# Optional
NODE_TLS_REJECT_UNAUTHORIZED=0   # Self-signed certs
API_PORT=3002                     # Express server port
DEBUG=1                           # Verbose output

# Azure VM auto-start (optional)
AZURE_TENANT_ID=...
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
AZURE_SUBSCRIPTION_ID=...
AZURE_RESOURCE_GROUP=...
AZURE_VM_NAME=...
```

## CI/CD Integration

### GitHub Actions (recommended)

Workflows in `.github/workflows/`:

- **`api-tests.yml`** - Runs on PR and push to main. Configurable test mode and POST tests via workflow dispatch.
- **`scheduled-tests.yml`** - Daily at 08:00 UTC. Checks API availability first, runs full regression + POST tests.

Required secrets: `SWAGGER_URL`, `TOKEN_URL`, `API_USERNAME`, `API_PASSWORD`

### CircleCI

Config in `.circleci/config.yml`. Three workflows: `pr-checks`, `merge-checks`, `nightly` (2 AM UTC).

### Bitbucket Pipelines

Config in `bitbucket-pipelines.yml`. Default, main branch, and PR pipelines.

## Web UI

A secondary dashboard for manual testing and inspection.

```bash
npm run dev    # Starts Express server (port 3002) + Vite (port 8002)
```

Pages:
- **Home** (`/`) - Enter Swagger URL and auth credentials
- **Dashboard** (`/dashboard`) - CLI command builder, terminal output, execution history
- **Endpoints** (`/endpoints`) - Browse and test discovered endpoints
- **Results** (`/results/:resource`) - Test result timeline and JSON diff viewer

## Development

```bash
npm run dev          # Server + Vite dev (concurrent)
npm run dev:web      # Vite only (port 8002)
npm run server       # Express only (port 3002)
npm run build        # Build web UI
npm run build:cli    # Build CLI (strict TypeScript)
npm run lint         # ESLint
npm run cli          # Run CLI via tsx (no build needed)
```

### Project Structure

```
src/
  cli/              # CLI commands and orchestration
    cli.ts          # Entry point (6 commands)
    orchestrator.ts # Test execution coordinator
    blacklist.ts    # 37+ excluded endpoints
    azure-starter.ts # Azure VM management
    junit-reporter.ts # JUnit XML generation
    coverage-analyzer.ts # API coverage reports
    format.ts       # CLI output formatting (colors, tables)
  lib/              # Shared core logic
    swagger.ts      # OpenAPI parser
    tester.ts       # CRUD test runner + OAuth2
    comparator.ts   # Deep diff engine
    data-discovery.ts # Real data extraction from API
    hierarchical-apis.ts # Parent-child API definitions
    post-endpoint-tester.ts # POST fixture testing
    test-fixtures.ts # POST test data
  components/       # React UI (shadcn/ui + custom)
  pages/            # React pages
  types/            # TypeScript definitions
server/             # Express API server for web UI
```

## Tech Stack

- **Runtime:** Node.js 18+
- **Language:** TypeScript (strict mode for CLI)
- **Frontend:** React 18, Vite, Tailwind CSS, shadcn/ui
- **CLI:** Commander.js
- **HTTP:** Axios
- **CI/CD:** GitHub Actions, CircleCI, Bitbucket Pipelines

## License

ISC

## Author

Vilmer Frost
