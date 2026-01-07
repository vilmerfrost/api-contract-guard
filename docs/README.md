# API Contract Guard

Automated API Contract Regression Testing with Azure VM auto-start and CI/CD integration.

## Overview

API Contract Guard is a dual-purpose tool that provides both a web UI and a CLI for automated API contract testing. It performs full CRUD regression tests against OpenAPI/Swagger specifications to ensure your API contracts remain stable across deployments.

> 📖 **For a comprehensive tool overview, see [TOOL-OVERVIEW.md](./TOOL-OVERVIEW.md)**

**Key Features:**
- 🌐 Modern web UI for manual testing and exploration
- 🖥️ CLI tool for automated CI/CD integration
- 🔄 **Hierarchical API Testing** ⭐ NEW: Tests parent-child relationships by looping through all parent resources
- 🚀 Automatic Azure VM startup for dev environments
- 🔐 OAuth2 authentication with token caching
- 📋 Endpoint blacklist filtering
- 📊 JUnit XML report generation
- 🔄 Full CRUD flow testing (GET → DELETE → POST → GET → COMPARE)
- ⚡ Parallel test execution support

## Installation

### For Web UI Development

```bash
npm install
npm run dev
```

The web UI will be available at `http://localhost:5173`

### For CLI Usage

```bash
# Build the CLI
npm run build:cli

# Run locally
npm run cli -- test --swagger-url <url> --token-url <url> --username <user> --password <pass>

# Install globally (optional)
npm install -g .
api-contract-guard test --swagger-url <url> ...
```

## CLI Usage

### Run Regression Tests

```bash
api-contract-guard test \
  --swagger-url https://pdq.swedencentral.cloudapp.azure.com/dev/app/openapi.json \
  --token-url https://pdq.swedencentral.cloudapp.azure.com/dev/app/token \
  --username $API_USERNAME \
  --password $API_PASSWORD \
  --output junit.xml
```

**Options:**
- `--swagger-url <url>` - OpenAPI/Swagger JSON URL (required)
- `--token-url <url>` - OAuth2 token endpoint (required)
- `--username <user>` - OAuth2 username (required, or use `API_USERNAME` env var)
- `--password <pass>` - OAuth2 password (required, or use `API_PASSWORD` env var)
- `--output <file>` - JUnit XML output file path (default: `junit.xml`)
- `--auto-start-vm` - Automatically start Azure VM if API is down (default: true)
- `--no-auto-start-vm` - Disable automatic VM start
- `--parallel` - Run tests in parallel (default: false)
- `--max-parallel <n>` - Maximum concurrent tests (default: 5)
- `--mode <mode>` - Test mode: `full` (CRUD) or `readonly` (GET only) (default: `full`)
- `--use-real-data` - Discover and use real IDs from API instead of placeholder "1" (default: false)
- `--use-hierarchical` ⭐ NEW - Test parent-child API relationships (loop through all parent resources) (default: false)

### Start Azure VM Manually

```bash
api-contract-guard vm-start \
  --api-url https://pdq.swedencentral.cloudapp.azure.com/dev/app/openapi.json \
  --max-wait 300
```

### List Endpoints

```bash
api-contract-guard list-endpoints \
  --swagger-url https://pdq.swedencentral.cloudapp.azure.com/dev/app/openapi.json
```

**Options:**
- `--include-blacklisted` - Include blacklisted endpoints in output

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      API Contract Guard                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐              ┌─────────────────┐           │
│  │  Web UI     │              │  CLI Tool       │           │
│  │  (React)    │              │  (Commander)    │           │
│  └──────┬──────┘              └────────┬────────┘           │
│         │                              │                     │
│         └──────────┬───────────────────┘                     │
│                    │                                         │
│         ┌──────────▼───────────┐                            │
│         │   Shared Core Logic  │                            │
│         ├──────────────────────┤                            │
│         │ • Swagger Parser     │                            │
│         │ • Deep Comparator    │                            │
│         │ • CRUD Test Runner   │                            │
│         │ • OAuth2 Manager     │                            │
│         └──────────────────────┘                            │
│                                                               │
│  CLI-Specific Components:                                    │
│  ┌──────────────┬──────────────┬─────────────┬───────────┐ │
│  │ Orchestrator │  Blacklist   │  Azure VM   │  JUnit    │ │
│  │              │  Filter      │  Starter    │  Reporter │ │
│  └──────────────┴──────────────┴─────────────┴───────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

### Full CRUD Test Flow

For each endpoint group (resource):

1. **GET** - Fetch existing resource data
2. **DELETE** - Remove the resource
3. **POST** - Recreate the resource with the same data (minus metadata fields)
4. **VERIFY** - Fetch the newly created resource
5. **COMPARE** - Deep compare original vs recreated (ignoring id, timestamps, etc.)

### Hierarchical API Testing ⭐ NEW

Tests parent-child API relationships by looping through all parent resources:

1. **Fetch Parent Resources** - Get all items from parent API (e.g., `/api/v2/systems`)
2. **Test Parent** - Verify parent API works
3. **Loop Through Resources** - For EACH parent resource:
   - Test all child APIs with that resource ID
   - Example: `/api/v3/ingest/connection/for/{system}`
4. **Version Fallback** - If v3 doesn't exist, uses v2 (earliest available)

**Example:**
```
GET /api/v2/systems → [SYS001, SYS002, SYS003, ...]

For EACH system:
  ✓ GET /api/v2/systems/{system}
  ✓ GET /api/v3/ingest/connection/for/{sourcesystem}
  ✓ GET /api/v3/ingest/list/for/{sourcesystem}
  ... (7 child APIs per system)

Result: 8 systems × 7 child APIs = 56 tests
```

**See:** `HIERARCHICAL-TESTING.md` for complete documentation

### Endpoint Blacklist

37 endpoints are excluded from testing due to side effects or operational concerns:
- Ingestion endpoints
- Schedule control endpoints
- Data lineage endpoints
- QPI/audit endpoints
- See `src/cli/blacklist.ts` for full list

### Azure VM Auto-Start

The CLI can automatically start the Azure development VM if the API is not accessible:
1. Check if API responds
2. If not, authenticate with Azure Management API
3. Send VM start command
4. Poll API until ready (max 5 minutes)

## CI/CD Integration

### CircleCI

Configuration provided in `.circleci/config.yml`

**Workflows:**
- `pr-checks` - Run on pull requests
- `merge-checks` - Run on merge to main
- `nightly` - Scheduled daily at 2 AM UTC

**Required Context Variables:**
- `API_USERNAME` - OAuth2 username
- `API_PASSWORD` - OAuth2 password

### Bitbucket Pipelines

Configuration provided in `bitbucket-pipelines.yml`

**Pipelines:**
- Default pipeline for all branches
- Main branch specific pipeline
- Pull request pipeline

**Required Repository Variables:**
- `API_USERNAME` - OAuth2 username
- `API_PASSWORD` - OAuth2 password

## Environment Variables

For local development and CI/CD:

```bash
# Required for authentication
export API_USERNAME="your-username"
export API_PASSWORD="your-password"

# Optional: Enable debug output
export DEBUG=1
```

## Development

### Project Structure

```
src/
├── cli/                      # CLI-specific code
│   ├── cli.ts               # Entry point with commands
│   ├── orchestrator.ts      # Test execution coordinator
│   ├── blacklist.ts         # Endpoint exclusion list
│   ├── azure-starter.ts     # VM auto-start logic
│   └── junit-reporter.ts    # XML report generator
├── lib/                     # Shared core logic
│   ├── swagger.ts           # OpenAPI parser
│   ├── comparator.ts        # Deep diff engine
│   ├── tester.ts            # CRUD test runner
│   └── ...
├── components/              # React UI components
├── pages/                   # React pages
└── types/                   # TypeScript definitions
```

### Build Commands

```bash
# Build web UI
npm run build

# Build CLI tool
npm run build:cli

# Development (web UI)
npm run dev

# Run CLI in development
npm run cli -- <command> [options]
```

## Testing Checklist

Before deploying:

- [ ] VM auto-starts when API is unreachable
- [ ] OAuth2 token acquired and cached properly
- [ ] All 37 blacklisted endpoints are skipped
- [ ] Full CRUD flow executes correctly
- [ ] Read-only mode (GET-only) works
- [ ] JUnit XML validates and contains correct data
- [ ] CLI exits with code 1 on test failure, 0 on success
- [ ] CircleCI config syntax is valid
- [ ] Environment variables work in CI context

## Technology Stack

- **Runtime:** Node.js 18+
- **Language:** TypeScript
- **Web Framework:** React + Vite
- **UI Components:** shadcn/ui + Radix UI
- **Styling:** Tailwind CSS
- **CLI Framework:** Commander.js
- **HTTP Client:** Axios
- **Testing:** Custom CRUD test engine
- **CI/CD:** CircleCI, Bitbucket Pipelines

## License

ISC

## Author

Vilmer Frost

## Repository

https://github.com/vilmerfrost/api-contract-guard
