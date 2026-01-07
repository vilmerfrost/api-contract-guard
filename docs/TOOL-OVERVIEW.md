# API Contract Guard - Tool Overview

## Executive Summary

**API Contract Guard** is a comprehensive automated testing tool designed to ensure API contract stability and prevent regressions. It provides both a modern web interface for manual exploration and a powerful CLI for CI/CD integration, making it suitable for developers, QA teams, and DevOps pipelines.

## What It Does

API Contract Guard automatically:
- Parses OpenAPI/Swagger specifications
- Discovers all API endpoints
- Performs full CRUD regression tests
- Validates contract consistency
- Generates JUnit XML reports for CI/CD
- Tests hierarchical parent-child API relationships
- Auto-starts Azure VMs for development environments

## Key Capabilities

### 1. **Dual Interface**
- **Web UI**: Interactive browser-based interface for manual testing and exploration
- **CLI**: Command-line tool for automation and CI/CD integration

### 2. **Intelligent Test Execution**
- **Full CRUD Flow**: GET → DELETE → POST → GET → COMPARE
- **Read-only Mode**: GET-only testing for safe exploration
- **Hierarchical Testing**: Tests parent-child relationships by looping through all parent resources
- **Real Data Discovery**: Automatically discovers and uses real IDs from the API
- **Parallel Execution**: Run multiple tests concurrently for faster results

### 3. **Smart Endpoint Management**
- **Blacklist Filtering**: Automatically excludes 37 problematic endpoints (ingestion, schedule control, etc.)
- **Resource Grouping**: Groups endpoints by resource for logical test organization
- **Parameter Substitution**: Intelligently substitutes path parameters with discovered real IDs

### 4. **Authentication & Security**
- **OAuth2 Support**: Full OAuth2 password grant flow
- **Bearer Token**: Standard bearer token authentication
- **API Key**: API key header support
- **Token Caching**: Efficient token reuse across tests

### 5. **Azure Integration**
- **VM Auto-Start**: Automatically starts Azure VMs when API is unreachable
- **Health Monitoring**: Polls API until ready (max 5 minutes)
- **Azure Management API**: Authenticates and controls Azure resources

### 6. **Reporting & Output**
- **JUnit XML**: Standard format for CI/CD integration
- **Console Output**: Rich formatted output with progress indicators
- **Test Results**: Detailed pass/fail status with differences
- **Export Capabilities**: Export test configurations and results

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│                    API Contract Guard                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐              ┌──────────────────┐    │
│  │   Web UI     │              │   CLI Tool       │    │
│  │   (React)    │              │   (Commander)     │    │
│  └──────┬───────┘              └────────┬──────────┘    │
│         │                               │                │
│         └───────────┬───────────────────┘                │
│                     │                                     │
│         ┌───────────▼──────────────┐                     │
│         │   Shared Core Logic      │                     │
│         ├──────────────────────────┤                     │
│         │ • Swagger Parser         │                     │
│         │ • Deep Comparator        │                     │
│         │ • CRUD Test Runner       │                     │
│         │ • OAuth2 Manager         │                     │
│         │ • Data Discovery         │                     │
│         │ • Hierarchical APIs      │                     │
│         └──────────────────────────┘                     │
│                                                           │
│  CLI-Specific Components:                                 │
│  ┌──────────────┬──────────────┬─────────────┬────────┐│
│  │ Orchestrator │  Blacklist   │  Azure VM   │  JUnit  ││
│  │              │  Filter       │  Starter    │ Reporter││
│  └──────────────┴──────────────┴─────────────┴────────┘│
└─────────────────────────────────────────────────────────┘
```

### Module Breakdown

#### **Core Libraries** (`src/lib/`)
- **`swagger.ts`**: OpenAPI/Swagger parser with Windows path handling
- **`comparator.ts`**: Deep object comparison with metadata stripping
- **`tester.ts`**: CRUD test execution engine
- **`data-discovery.ts`**: Real ID discovery from API responses
- **`hierarchical-apis.ts`**: Parent-child API relationship definitions
- **`exporter.ts`**: Configuration and result export
- **`utils.ts`**: Shared utilities (HTTPS agent, axios instance)

#### **CLI Components** (`src/cli/`)
- **`cli.ts`**: Command-line interface with Commander.js
- **`orchestrator.ts`**: Test execution coordinator
- **`blacklist.ts`**: Endpoint exclusion logic
- **`azure-starter.ts`**: Azure VM management
- **`junit-reporter.ts`**: XML report generation

#### **Web UI Components** (`src/components/`, `src/pages/`)
- **`Home.tsx`**: Swagger URL input and configuration
- **`Endpoints.tsx`**: Endpoint discovery and test initiation
- **`Results.tsx`**: Test results visualization
- **`DiffViewer.tsx`**: JSON difference visualization
- **`ResultsTimeline.tsx`**: Test execution timeline

## Use Cases

### 1. **CI/CD Integration**
Automate contract testing in your deployment pipeline:
```bash
api-contract-guard test \
  --swagger-url $SWAGGER_URL \
  --token-url $TOKEN_URL \
  --username $API_USERNAME \
  --password $API_PASSWORD \
  --output junit.xml
```

### 2. **Pre-Deployment Validation**
Verify API contracts before releasing:
- Run full CRUD tests
- Check for breaking changes
- Validate response structures

### 3. **Development Testing**
Use web UI for interactive exploration:
- Discover available endpoints
- Test individual resources
- View detailed differences
- Export test configurations

### 4. **Regression Detection**
Catch contract changes early:
- Compare responses before/after changes
- Identify unexpected field modifications
- Track response structure evolution

### 5. **API Documentation Validation**
Ensure Swagger spec matches reality:
- Test all documented endpoints
- Verify parameter handling
- Validate response schemas

## Test Modes

### Full Mode (Default)
Complete CRUD regression test:
1. **GET** - Fetch existing resource
2. **DELETE** - Remove resource
3. **POST** - Recreate with same data
4. **VERIFY** - Fetch newly created resource
5. **COMPARE** - Deep diff (ignoring metadata)

### Read-only Mode
Safe exploration without modifications:
1. **GET** - Verify endpoint returns 200
2. **No modifications** - Safe for production

### Hierarchical Mode ⭐ NEW
Tests parent-child relationships:
1. **Fetch Parents** - Get all parent resources
2. **Loop Through** - Test each parent's child APIs
3. **Version Fallback** - Use earliest available API version

## Data Discovery

The tool intelligently discovers real test data:

### Discovered Resources
- **Sourcefiles**: From `/api/v2/sourcefiles` or `/api/v3/sourcefiles`
- **Systems**: From `/api/v2/systems` or extracted from schedules
- **Model Objects**: From `/api/v2/model`
- **Schedules**: From `/api/v2/schedule`
- **Connections**: From `/api/v2/datastore/connection`
- **Attributes**: From model object attributes endpoints
- **Audit Zones/Keys**: From audit endpoints
- **Export Aliases**: From `/api/v2/exportlist/for/{system}`
- **Ingest Aliases**: From `/api/v3/ingest/list/for/{system}`

### Parameter Mapping
Automatically maps path parameters to discovered data:
- `{sourcefile}` → Uses `sourceFilename` from sourcefiles
- `{sourcesystem}` → Uses `system` from systems
- `{mObject}` → Uses `object` from modelObjects
- `{zone}` → Uses discovered audit zones
- `{alias}` → Uses discovered ingest/export aliases

## Integration Points

### CI/CD Platforms
- **CircleCI**: `.circleci/config.yml` with workflows
- **Bitbucket Pipelines**: `bitbucket-pipelines.yml` configuration
- **GitHub Actions**: Compatible via JUnit XML output
- **Jenkins**: Standard JUnit XML support

### Output Formats
- **JUnit XML**: Standard CI/CD format
- **Console**: Rich formatted output
- **JSON**: Exportable test configurations
- **YAML**: Configuration export

### Authentication Methods
- **OAuth2**: Password grant flow
- **Bearer Token**: Standard Authorization header
- **API Key**: Custom header support

## Performance Features

### Parallel Execution
- Run multiple tests concurrently
- Configurable concurrency limit (default: 5)
- Faster test execution for large APIs

### Smart Caching
- OAuth2 token caching
- Discovered data reuse
- Efficient resource management

### Timeout Management
- Configurable request timeouts (default: 30s)
- Azure VM startup timeout (default: 5 minutes)
- Graceful failure handling

## Security Features

### Credential Management
- Environment variable support
- No hardcoded credentials
- Secure token handling

### HTTPS Support
- Self-signed certificate handling
- Configurable TLS rejection
- Azure VM certificate support

### Safe Testing
- Blacklist prevents dangerous operations
- Read-only mode for production
- Metadata field exclusion

## Limitations & Considerations

### Blacklisted Endpoints
37 endpoints are excluded due to:
- Side effects (ingestion, schedule control)
- Operational concerns (data lineage, QPI)
- Safety requirements

### Azure VM Integration
Currently hardcoded for PDQ development environment:
- Tenant: `559961f7-70ad-4623-92b6-9ef9c6c467a9`
- Resource Group: `rg-pdq-dev-demo-001`
- VM Name: `vm-pdq-001`

### Test Data Requirements
- Requires at least one resource in each endpoint group
- Falls back to placeholder "1" if no data discovered
- Real data discovery improves test reliability

## Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Web Framework**: React + Vite
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **CLI Framework**: Commander.js
- **HTTP Client**: Axios
- **Testing**: Custom CRUD test engine
- **CI/CD**: CircleCI, Bitbucket Pipelines

## Getting Started

### Quick Start
```bash
# Install dependencies
npm install

# Build CLI
npm run build:cli

# Run tests
node dist/cli/cli.js test \
  --swagger-url <url> \
  --token-url <url> \
  --username <user> \
  --password <pass>
```

### Web UI
```bash
# Start development server
npm run dev

# Build for production
npm run build
```

## Documentation

- **README.md**: Main documentation
- **QUICKSTART.md**: Quick reference guide
- **HIERARCHICAL-TESTING.md**: Hierarchical API testing guide
- **HIERARCHICAL-QUICKSTART.md**: Quick start for hierarchical testing
- **CONTRIBUTING.md**: Contribution guidelines

## Support & Maintenance

### Exit Codes
- `0`: All tests passed
- `1`: Tests failed or error occurred

### Debugging
Enable debug output:
```bash
export DEBUG_DISCOVERY="true"
export DEBUG=1
```

### Common Issues
- **CORS errors**: Use proxy or ensure API allows cross-origin
- **VM not starting**: Check Azure credentials and permissions
- **No endpoints found**: Verify Swagger URL is accessible
- **Authentication failures**: Check credentials and token URL

## Future Enhancements

Potential improvements:
- Support for more authentication methods
- Custom blacklist configuration
- Test result persistence
- Historical comparison tracking
- Webhook notifications
- Multi-environment support
- Custom test assertions

---

**Version**: 1.0.0  
**Author**: Vilmer Frost  
**Repository**: https://github.com/vilmerfrost/api-contract-guard  
**License**: ISC

