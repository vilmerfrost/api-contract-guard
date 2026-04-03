/**
 * CLI Output Formatting
 * ANSI color helpers for professional CLI output. No external dependencies.
 */

// ANSI color codes
export const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgBlue: '\x1b[44m',
  bgCyan: '\x1b[46m',
};

export function banner(): void {
  console.log('');
  console.log(`  ${c.cyan}${c.bold}┌──────────────────────────────────────────────────────┐${c.reset}`);
  console.log(`  ${c.cyan}${c.bold}│${c.reset}                                                      ${c.cyan}${c.bold}│${c.reset}`);
  console.log(`  ${c.cyan}${c.bold}│${c.reset}   ${c.bold}${c.white}⛊  API Contract Guard${c.reset}  ${c.dim}v1.0.0${c.reset}                     ${c.cyan}${c.bold}│${c.reset}`);
  console.log(`  ${c.cyan}${c.bold}│${c.reset}   ${c.dim}Automated API Regression Testing${c.reset}                 ${c.cyan}${c.bold}│${c.reset}`);
  console.log(`  ${c.cyan}${c.bold}│${c.reset}                                                      ${c.cyan}${c.bold}│${c.reset}`);
  console.log(`  ${c.cyan}${c.bold}└──────────────────────────────────────────────────────┘${c.reset}`);
  console.log('');
}

export function customHelp(): void {
  banner();

  console.log(`  ${c.bold}${c.white}USAGE${c.reset}`);
  console.log(`    ${c.cyan}gate${c.reset} ${c.dim}<command>${c.reset} ${c.dim}[options]${c.reset}`);
  console.log('');

  console.log(`  ${c.bold}${c.white}COMMANDS${c.reset}`);
  console.log(`    ${c.green}test${c.reset}              Run API regression tests ${c.dim}(GET, POST, CRUD)${c.reset}`);
  console.log(`    ${c.green}test-posts${c.reset}        Run POST endpoint tests with fixtures`);
  console.log(`    ${c.green}list-endpoints${c.reset}    List all testable endpoints from Swagger`);
  console.log(`    ${c.green}coverage${c.reset}          Generate API coverage report`);
  console.log(`    ${c.yellow}vm-start${c.reset}          Start Azure VM and wait for readiness`);
  console.log(`    ${c.dim}get${c.reset}               Export env vars from .env.local`);
  console.log('');

  console.log(`  ${c.bold}${c.white}QUICK START${c.reset}`);
  console.log(`    ${c.dim}# Run readonly tests with real data${c.reset}`);
  console.log(`    ${c.cyan}gate test${c.reset} --swagger-url <url> --token-url <url> \\`);
  console.log(`      --username <user> --password <pass> --mode readonly --use-real-data`);
  console.log('');
  console.log(`    ${c.dim}# Run POST fixture tests${c.reset}`);
  console.log(`    ${c.cyan}gate test-posts${c.reset} --swagger-url <url> --token-url <url> \\`);
  console.log(`      --username <user> --password <pass>`);
  console.log('');
  console.log(`    ${c.dim}# List endpoints without credentials${c.reset}`);
  console.log(`    ${c.cyan}gate list-endpoints${c.reset} --swagger-url <url>`);
  console.log('');

  console.log(`  ${c.bold}${c.white}OPTIONS${c.reset}`);
  console.log(`    ${c.dim}Run${c.reset} ${c.cyan}gate <command> --help${c.reset} ${c.dim}for command-specific options${c.reset}`);
  console.log('');

  console.log(`  ${c.bold}${c.white}EXAMPLES${c.reset}`);
  console.log(`    ${c.cyan}gate test${c.reset} ${c.dim}--parallel --use-real-data${c.reset}      ${c.dim}# Fast parallel tests${c.reset}`);
  console.log(`    ${c.cyan}gate test${c.reset} ${c.dim}--use-hierarchical${c.reset}              ${c.dim}# Parent-child API tests${c.reset}`);
  console.log(`    ${c.cyan}gate test-posts${c.reset} ${c.dim}--module Systems${c.reset}           ${c.dim}# Test only Systems module${c.reset}`);
  console.log(`    ${c.cyan}gate coverage${c.reset} ${c.dim}--test-results junit.xml${c.reset}     ${c.dim}# Coverage from results${c.reset}`);
  console.log('');
}

export function demo(): void {
  banner();

  heading('Configuration');
  info(`Swagger URL: ${c.cyan}https://api.example.com/openapi.json${c.reset}`);
  info(`Auth: ${c.cyan}OAuth2 (password grant)${c.reset}`);
  info(`Mode: ${c.cyan}readonly${c.reset} | Parallel: ${c.cyan}5${c.reset} | Real data: ${c.cyan}yes${c.reset}`);

  heading('Discovering API Endpoints');
  info(`Found ${c.bold}164${c.reset} endpoints in 23 groups`);
  info(`Testable: ${c.green}109${c.reset} | Blacklisted: ${c.yellow}55${c.reset}`);

  heading('GET Endpoint Tests');
  progress(1, 61, `${c.green}GET${c.reset}  /api/v2/systems`);
  pass(`/api/v2/systems ${c.dim}(312ms)${c.reset}`);
  progress(2, 61, `${c.green}GET${c.reset}  /api/v2/sourcefiles`);
  pass(`/api/v2/sourcefiles ${c.dim}(287ms)${c.reset}`);
  progress(3, 61, `${c.green}GET${c.reset}  /api/v3/sourcefiles`);
  pass(`/api/v3/sourcefiles ${c.dim}(198ms)${c.reset}`);
  progress(4, 61, `${c.green}GET${c.reset}  /api/v2/model`);
  pass(`/api/v2/model ${c.dim}(156ms)${c.reset}`);
  progress(5, 61, `${c.green}GET${c.reset}  /api/v2/connections`);
  fail(`/api/v2/connections ${c.dim}(2401ms)${c.reset} ${c.red}— 500 Internal Server Error${c.reset}`);
  console.log(`    ${c.dim}[blacklisted: known server-side error]${c.reset}`);
  progress(6, 61, `${c.green}GET${c.reset}  /api/v2/schedule`);
  skip('schedule/state — blacklisted (side effects)');
  console.log(`  ${c.dim}...${c.reset}`);
  progress(61, 61, `${c.green}GET${c.reset}  /api/v4/export/aliases`);
  pass(`/api/v4/export/aliases ${c.dim}(89ms)${c.reset}`);

  heading('POST Fixture Tests');
  progress(1, 6, `${c.blue}POST${c.reset} /api/v2/systems/__test__system`);
  pass(`Systems: Create test system ${c.dim}(445ms)${c.reset}`);
  progress(2, 6, `${c.blue}POST${c.reset} /api/v2/sourcefiles/__test__sourcefile_v2`);
  pass(`Sourcefiles-v2: Create test sourcefile ${c.dim}(523ms)${c.reset}`);
  progress(3, 6, `${c.blue}POST${c.reset} /api/v3/sourcefiles/__test__sourcefile_v3`);
  pass(`Sourcefiles-v3: Create test sourcefile ${c.dim}(389ms)${c.reset}`);
  console.log(`  ${c.dim}...${c.reset}`);
  progress(6, 6, `${c.blue}POST${c.reset} /api/v2/model/__test__model_obj`);
  pass(`Model: Create test model object ${c.dim}(267ms)${c.reset}`);

  summaryTable(67, 64, 1, 2, 31234);

  console.log(`  ${c.dim}JUnit report: junit.xml${c.reset}`);
  console.log(`  ${c.dim}Coverage: api-coverage-report.md${c.reset}`);
  console.log('');
}

export function pass(msg: string): void {
  console.log(`  ${c.green}✓${c.reset} ${msg}`);
}

export function fail(msg: string): void {
  console.log(`  ${c.red}✗${c.reset} ${msg}`);
}

export function skip(msg: string): void {
  console.log(`  ${c.yellow}○${c.reset} ${c.dim}${msg}${c.reset}`);
}

export function info(msg: string): void {
  console.log(`  ${c.cyan}ℹ${c.reset} ${msg}`);
}

export function heading(msg: string): void {
  console.log(`\n${c.bold}${c.white}  ${msg}${c.reset}`);
  console.log(`  ${'─'.repeat(msg.length)}`);
}

export function progress(current: number, total: number, msg: string): void {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  console.log(`  ${c.dim}[${current}/${total}]${c.reset} ${msg}`);
}

export function summaryTable(total: number, passed: number, failed: number, skipped: number, duration: number): void {
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
  const dur = (duration / 1000).toFixed(1);
  const status = failed === 0 ? `${c.bgGreen}${c.bold} PASS ${c.reset}` : `${c.bgRed}${c.bold} FAIL ${c.reset}`;

  console.log('');
  console.log(`  ${c.bold}┌─────────────────────────────────────────┐${c.reset}`);
  console.log(`  ${c.bold}│${c.reset}  ${status}  ${passRate}% pass rate  (${dur}s)${c.reset}`);
  console.log(`  ${c.bold}├─────────────────────────────────────────┤${c.reset}`);
  console.log(`  ${c.bold}│${c.reset}  ${c.green}Passed:${c.reset}  ${String(passed).padStart(4)}`);
  console.log(`  ${c.bold}│${c.reset}  ${c.red}Failed:${c.reset}  ${String(failed).padStart(4)}`);
  console.log(`  ${c.bold}│${c.reset}  ${c.yellow}Skipped:${c.reset} ${String(skipped).padStart(4)}`);
  console.log(`  ${c.bold}│${c.reset}  ${c.cyan}Total:${c.reset}   ${String(total).padStart(4)}`);
  console.log(`  ${c.bold}└─────────────────────────────────────────┘${c.reset}`);
  console.log('');
}
