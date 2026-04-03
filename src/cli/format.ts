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
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
};

export function banner(): void {
  console.log(`
${c.cyan}${c.bold}  ╔══════════════════════════════════════════════════════╗
  ║          API Contract Guard  v1.0.0                  ║
  ║          Automated API Regression Testing            ║
  ╚══════════════════════════════════════════════════════╝${c.reset}
`);
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
