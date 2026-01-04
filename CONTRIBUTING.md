# Contributing to API Contract Guard

Thank you for your interest in contributing to API Contract Guard!

## Development Setup

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/vilmerfrost/api-contract-guard.git
   cd api-contract-guard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the CLI**
   ```bash
   npm run build:cli
   ```

## Development Workflow

### Web UI Development
```bash
npm run dev
```
This starts the Vite dev server at `http://localhost:5173`

### CLI Development
```bash
npm run cli -- <command> [options]
```
Uses `tsx` to run TypeScript directly without building.

Example:
```bash
npm run cli -- list-endpoints --swagger-url https://api.example.com/openapi.json
```

### Building

**Build Web UI:**
```bash
npm run build
```

**Build CLI:**
```bash
npm run build:cli
```

## Project Structure

```
src/
├── cli/                    # CLI-specific code
│   ├── cli.ts             # Entry point (uses Commander.js)
│   ├── orchestrator.ts    # Test execution coordinator
│   ├── blacklist.ts       # Endpoint filtering
│   ├── azure-starter.ts   # Azure VM management
│   └── junit-reporter.ts  # JUnit XML generation
├── lib/                   # Shared logic (used by both CLI and Web UI)
│   ├── swagger.ts         # OpenAPI/Swagger parser
│   ├── comparator.ts      # Deep object comparison
│   ├── tester.ts          # CRUD test execution
│   └── ...
├── components/            # React components (Web UI)
├── pages/                 # React pages (Web UI)
└── types/                 # TypeScript type definitions
```

## Code Guidelines

### TypeScript
- Use strict type checking where possible
- Define interfaces for all data structures
- Use `@/` path alias for imports from `src/`

### CLI Code
- Keep CLI code in `src/cli/`
- Reuse shared logic from `src/lib/`
- Add comprehensive error handling
- Provide helpful console output with symbols (✅, ❌, ⏳, etc.)

### Web UI Code
- Use shadcn/ui components
- Follow React best practices
- Keep components focused and reusable

## Testing Your Changes

### Manual CLI Testing
```bash
# Build and run
npm run build:cli
node dist/cli/cli.js test --swagger-url <url> ...

# Or use tsx for rapid iteration
npm run cli -- test --swagger-url <url> ...
```

### Testing with Real API
Set up environment variables:
```bash
export API_USERNAME="your-username"
export API_PASSWORD="your-password"
```

Then run:
```bash
npm run cli -- test \
  --swagger-url https://pdq.swedencentral.cloudapp.azure.com/dev/app/openapi.json \
  --token-url https://pdq.swedencentral.cloudapp.azure.com/dev/app/token \
  --username $API_USERNAME \
  --password $API_PASSWORD
```

## Adding New Features

### Adding a New CLI Command

1. Edit `src/cli/cli.ts`
2. Add new command using Commander.js:
   ```typescript
   program
     .command('my-command')
     .description('Description')
     .option('--my-option <value>', 'Option description')
     .action(async (options) => {
       // Implementation
     });
   ```

### Modifying Test Logic

1. Edit `src/lib/tester.ts` for test execution
2. Edit `src/cli/orchestrator.ts` for test coordination
3. Ensure changes work for both CLI and Web UI

### Updating Endpoint Blacklist

1. Edit `src/cli/blacklist.ts`
2. Add endpoint to `EXCLUDED_ENDPOINTS` array
3. Use format: `METHOD /path/with/{parameters}`

## Commit Guidelines

- Use clear, descriptive commit messages
- Reference issues when applicable
- Keep commits focused on single changes

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes
6. Push to your fork
7. Open a Pull Request

### PR Checklist
- [ ] Code builds without errors
- [ ] CLI commands work as expected
- [ ] Web UI still functions (if applicable)
- [ ] No linter errors
- [ ] README updated (if needed)
- [ ] Tests pass (if applicable)

## Questions?

Feel free to open an issue for:
- Bug reports
- Feature requests
- Questions about the codebase
- Clarifications on contributing

## License

By contributing, you agree that your contributions will be licensed under the ISC License.

