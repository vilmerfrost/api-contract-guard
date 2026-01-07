# API Contract Guard - Quick Reference

## Quick Start

### CLI Installation
```bash
npm install
npm run build:cli
```

### Run Tests
```bash
node dist/cli/cli.js test \
  --swagger-url <swagger-url> \
  --token-url <token-url> \
  --username <username> \
  --password <password>
```

## Common Commands

### Test with VM Auto-Start
```bash
node dist/cli/cli.js test \
  --swagger-url https://pdq.swedencentral.cloudapp.azure.com/dev/app/openapi.json \
  --token-url https://pdq.swedencentral.cloudapp.azure.com/dev/app/token \
  --username $API_USERNAME \
  --password $API_PASSWORD \
  --output junit.xml
```

### Start VM Only
```bash
node dist/cli/cli.js vm-start \
  --api-url https://pdq.swedencentral.cloudapp.azure.com/dev/app/openapi.json
```

### List Endpoints
```bash
node dist/cli/cli.js list-endpoints \
  --swagger-url https://pdq.swedencentral.cloudapp.azure.com/dev/app/openapi.json
```

### Parallel Testing
```bash
node dist/cli/cli.js test \
  --swagger-url <url> \
  --token-url <url> \
  --username <user> \
  --password <pass> \
  --parallel \
  --max-parallel 10
```

### Readonly Mode (GET only)
```bash
node dist/cli/cli.js test \
  --swagger-url <url> \
  --token-url <url> \
  --username <user> \
  --password <pass> \
  --mode readonly
```

## Environment Variables

```bash
export API_USERNAME="your-username"
export API_PASSWORD="your-password"
export SWAGGER_URL="https://api.example.com/openapi.json"
export TOKEN_URL="https://api.example.com/token"
```

Then use:
```bash
node dist/cli/cli.js test \
  --swagger-url $SWAGGER_URL \
  --token-url $TOKEN_URL \
  --username $API_USERNAME \
  --password $API_PASSWORD
```

## CI/CD Setup

### CircleCI
Add to context `api-credentials`:
- `API_USERNAME`
- `API_PASSWORD`

### Bitbucket Pipelines
Add to repository variables:
- `API_USERNAME`
- `API_PASSWORD`

## Development

### Run CLI in Dev Mode
```bash
npm run cli -- test --swagger-url <url> --token-url <url> --username <user> --password <pass>
```

### Build CLI
```bash
npm run build:cli
```

### Build Web UI
```bash
npm run build
```

### Start Web UI Dev Server
```bash
npm run dev
```

## Exit Codes

- `0` - All tests passed
- `1` - Tests failed or error occurred

## Output Formats

- Console: Rich formatted output with symbols
- JUnit XML: Specified with `--output` flag

## Blacklisted Endpoints

37 endpoints are automatically excluded (see `src/cli/blacklist.ts`):
- Ingestion endpoints
- Schedule control
- Data lineage
- QPI/audit endpoints

## Test Flow

### Full Mode (default)
1. GET - Fetch resource
2. DELETE - Remove resource
3. POST - Recreate resource
4. VERIFY - Get new resource
5. COMPARE - Deep diff

### Readonly Mode
1. GET - Check if endpoint returns 200

## Azure VM Configuration

Hardcoded for PDQ development environment:
- Tenant: `559961f7-70ad-4623-92b6-9ef9c6c467a9`
- Resource Group: `rg-pdq-dev-demo-001`
- VM Name: `vm-pdq-001`
- Max wait: 300 seconds (5 minutes)

## Help

```bash
node dist/cli/cli.js --help
node dist/cli/cli.js test --help
node dist/cli/cli.js vm-start --help
node dist/cli/cli.js list-endpoints --help
```

