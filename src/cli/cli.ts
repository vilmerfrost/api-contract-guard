#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AzureVMStarter } from './azure-starter.js';
import { TestOrchestrator } from './orchestrator.js';
import { writeJUnitReport } from './junit-reporter.js';
import { parseSwaggerUrl } from '../lib/swagger.js';
import { filterBlacklistedEndpoints } from './blacklist.js';
import { CoverageAnalyzer } from './coverage-analyzer.js';
import { AuthConfig, Endpoint } from '../types/index.js';

const program = new Command();

program
  .name('api-contract-guard')
  .description('Automated API Contract Regression Testing')
  .version('1.0.0');

/**
 * Test command - Run regression tests
 */
program
  .command('test')
  .description('Run API regression tests against Swagger/OpenAPI spec')
  .requiredOption('--swagger-url <url>', 'Swagger/OpenAPI JSON URL')
  .requiredOption('--token-url <url>', 'OAuth2 token endpoint')
  .requiredOption('--username <user>', 'OAuth2 username (or use env var API_USERNAME)')
  .requiredOption('--password <pass>', 'OAuth2 password (or use env var API_PASSWORD)')
  .option('--output <file>', 'JUnit XML output file path', 'junit.xml')
  .option('--auto-start-vm', 'Automatically start Azure VM if API is down', true)
  .option('--no-auto-start-vm', 'Do not automatically start Azure VM')
  .option('--parallel', 'Run tests in parallel', false)
  .option('--max-parallel <n>', 'Maximum parallel tests', '5')
  .option('--mode <mode>', 'Test mode: full (CRUD) or readonly (GET only)', 'full')
  .option('--use-real-data', 'Discover and use real IDs from API instead of placeholder "1"', false)
  .option('--use-hierarchical', 'Test parent-child API relationships (loop through all parent resources)', false)
  .option('--test-posts', 'Run POST endpoint tests with predefined fixtures', false)
  .option('--skip-cleanup', 'Skip cleanup step in POST fixture tests', false)
  .action(async (options) => {
    try {
      console.log('🚀 API Contract Guard - Starting Tests');
      console.log('═══════════════════════════════════════');
      console.log('');
      
      // Ensure VM is running if auto-start is enabled
      if (options.autoStartVm) {
        const vmStarter = new AzureVMStarter();
        await vmStarter.ensureVMRunning(options.swaggerUrl);
        console.log('');
      }
      
      // Setup authentication
      const auth: AuthConfig = {
        type: 'oauth2',
        username: options.username || process.env.API_USERNAME,
        password: options.password || process.env.API_PASSWORD,
        tokenUrl: options.tokenUrl
      };
      
      if (!auth.username || !auth.password) {
        throw new Error('Username and password are required (via flags or env vars API_USERNAME/API_PASSWORD)');
      }
      
      // Validate mutually exclusive options
      if (options.useRealData && options.useHierarchical) {
        console.warn('⚠️  Note: --use-hierarchical includes its own data discovery.');
        console.warn('   --use-real-data flag will be ignored in hierarchical mode.');
        console.log('');
      }
      
      // Run tests
      const orchestrator = new TestOrchestrator({
        swaggerUrl: options.swaggerUrl,
        auth,
        mode: options.mode,
        parallel: options.parallel,
        maxParallel: parseInt(options.maxParallel),
        useRealData: options.useRealData,
        useHierarchical: options.useHierarchical,
        testPosts: options.testPosts,
        skipCleanup: options.skipCleanup
      });
      
      const result = await orchestrator.runAll();
      
      // Print summary
      orchestrator.printSummary(result);
      
      // Generate JUnit report
      if (options.output) {
        writeJUnitReport(result.results, options.output, 'API Contract Regression Tests');
      }
      
      // Exit with appropriate code
      const exitCode = result.failed > 0 ? 1 : 0;
      
      if (exitCode === 0) {
        console.log('✅ All tests passed!');
      } else {
        console.log('❌ Some tests failed');
      }
      
      process.exit(exitCode);
      
    } catch (error: any) {
      console.error('');
      console.error('❌ Error:', error.message);
      if (error.stack && process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

/**
 * Test POST command - Run POST endpoint tests with fixtures
 */
program
  .command('test-posts')
  .description('Run POST endpoint tests with predefined fixtures')
  .requiredOption('--swagger-url <url>', 'Swagger/OpenAPI JSON URL (for base URL extraction)')
  .requiredOption('--token-url <url>', 'OAuth2 token endpoint')
  .requiredOption('--username <user>', 'OAuth2 username (or use env var API_USERNAME)')
  .requiredOption('--password <pass>', 'OAuth2 password (or use env var API_PASSWORD)')
  .option('--output <file>', 'JUnit XML output file path', 'junit-posts.xml')
  .option('--auto-start-vm', 'Automatically start Azure VM if API is down', true)
  .option('--no-auto-start-vm', 'Do not automatically start Azure VM')
  .option('--skip-cleanup', 'Skip cleanup step after tests', false)
  .option('--skip-verify', 'Skip verification step after POST', false)
  .option('--module <name>', 'Only run tests for specific module (e.g., SystemHandler, Model)')
  .action(async (options) => {
    try {
      console.log('🚀 API Contract Guard - POST Endpoint Tests');
      console.log('═══════════════════════════════════════');
      console.log('');
      
      // Ensure VM is running if auto-start is enabled
      if (options.autoStartVm) {
        const vmStarter = new AzureVMStarter();
        await vmStarter.ensureVMRunning(options.swaggerUrl);
        console.log('');
      }
      
      // Setup authentication
      const auth: AuthConfig = {
        type: 'oauth2',
        username: options.username || process.env.API_USERNAME,
        password: options.password || process.env.API_PASSWORD,
        tokenUrl: options.tokenUrl
      };
      
      if (!auth.username || !auth.password) {
        throw new Error('Username and password are required (via flags or env vars API_USERNAME/API_PASSWORD)');
      }
      
      // Run POST tests
      const orchestrator = new TestOrchestrator({
        swaggerUrl: options.swaggerUrl,
        auth,
        mode: 'full',
        testPosts: true,
        skipCleanup: options.skipCleanup,
        skipVerify: options.skipVerify,
        postModule: options.module
      });
      
      const result = await orchestrator.runPostTests();
      
      // Print summary
      orchestrator.printPostSummary(result);
      
      // Generate JUnit report
      if (options.output) {
        writeJUnitReport(result.results, options.output, 'POST Endpoint Tests');
      }
      
      // Exit with appropriate code
      const exitCode = result.failed > 0 ? 1 : 0;
      
      if (exitCode === 0) {
        console.log('✅ All POST tests passed!');
      } else {
        console.log('❌ Some POST tests failed');
      }
      
      process.exit(exitCode);
      
    } catch (error: any) {
      console.error('');
      console.error('❌ Error:', error.message);
      if (error.stack && process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

/**
 * VM Start command - Manually start Azure VM
 */
program
  .command('vm-start')
  .description('Start the Azure VM and wait for API to be ready')
  .requiredOption('--api-url <url>', 'API URL to check for readiness')
  .option('--max-wait <seconds>', 'Maximum seconds to wait for API', '300')
  .action(async (options) => {
    try {
      console.log('🚀 Starting Azure VM...');
      console.log('');
      
      const vmStarter = new AzureVMStarter();
      await vmStarter.ensureVMRunning(options.apiUrl);
      
      console.log('');
      console.log('✅ VM is running and API is ready');
      process.exit(0);
      
    } catch (error: any) {
      console.error('');
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

/**
 * List Endpoints command - Display all testable endpoints
 */
program
  .command('list-endpoints')
  .description('List all endpoints from Swagger (excluding blacklisted)')
  .requiredOption('--swagger-url <url>', 'Swagger/OpenAPI JSON URL')
  .option('--include-blacklisted', 'Include blacklisted endpoints in output', false)
  .option('--show-full-urls', 'Show full URLs with base URL', false)
  .action(async (options) => {
    try {
      console.log('📋 Fetching endpoints from Swagger...');
      console.log('');
      
      const { groups, baseUrl } = await parseSwaggerUrl(options.swaggerUrl);
      
      console.log(`Base URL: ${baseUrl}`);
      console.log('');
      
      let totalCount = 0;
      let blacklistedCount = 0;
      
      groups.forEach(group => {
        const endpoints = options.includeBlacklisted 
          ? group.endpoints 
          : filterBlacklistedEndpoints(group.endpoints);
        
        if (endpoints.length === 0) return;
        
        console.log(`\n📁 ${group.resource}`);
        console.log('─'.repeat(70));
        
        endpoints.forEach(endpoint => {
          const color = getMethodColor(endpoint.method);
          const testPath = endpoint.path.replace(/\{[^}]+\}/g, '1');
          const fullUrl = `${baseUrl}${testPath}`;
          
          if (options.showFullUrls) {
            console.log(`  ${color} ${endpoint.method.padEnd(6)} ${fullUrl}`);
            if (endpoint.path !== testPath) {
              console.log(`      Path: ${endpoint.path}`);
            }
          } else {
            console.log(`  ${color} ${endpoint.method.padEnd(6)} ${endpoint.path}`);
          }
          
          if (endpoint.summary) {
            console.log(`         ${endpoint.summary}`);
          }
          totalCount++;
        });
        
        const blacklisted = group.endpoints.length - endpoints.length;
        if (blacklisted > 0) {
          blacklistedCount += blacklisted;
          console.log(`  ⊘ ${blacklisted} endpoint(s) blacklisted`);
        }
      });
      
      console.log('');
      console.log('═══════════════════════════════════════');
      console.log(`Total Endpoints: ${totalCount + blacklistedCount}`);
      console.log(`Testable: ${totalCount}`);
      console.log(`Blacklisted: ${blacklistedCount}`);
      console.log('═══════════════════════════════════════');
      
      process.exit(0);
      
    } catch (error: any) {
      console.error('');
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

/**
 * Get credentials command - Output export commands for env vars
 * Usage: eval "$(node dist/cli/cli.js get)"
 */
program
  .command('get')
  .description('Output export commands for environment variables from .env.local')
  .option('--file <path>', 'Path to credentials file', '.env.local')
  .action((options) => {
    const envFile = options.file || '.env.local';
    const envPath = join(process.cwd(), envFile);
    
    if (!existsSync(envPath)) {
      console.error(`# ❌ File not found: ${envPath}`);
      console.error('# Create .env.local with:');
      console.error('#   API_USERNAME=your-username');
      console.error('#   API_PASSWORD=your-password');
      console.error('#   SWAGGER_URL=https://...');
      console.error('#   TOKEN_URL=https://...');
      process.exit(1);
    }
    
    try {
      const content = readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (match) {
          const [, key, value] = match;
          // Remove surrounding quotes if present
          const cleanValue = value.replace(/^["']|["']$/g, '');
          console.log(`export ${key}="${cleanValue}"`);
        }
      }
    } catch (error: any) {
      console.error(`# ❌ Error reading file: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Coverage command - Generate API coverage report
 */
program
  .command('coverage')
  .description('Generate comprehensive API coverage report')
  .requiredOption('--swagger-url <url>', 'Swagger/OpenAPI JSON URL')
  .option('--test-results <file>', 'JUnit XML test results file to analyze')
  .option('--format <format>', 'Output format: console, markdown, or both', 'both')
  .action(async (options) => {
    try {
      console.log('🔍 Generating API Coverage Report...');
      console.log('');
      
      // Parse Swagger
      console.log(`📋 Parsing Swagger from: ${options.swaggerUrl}`);
      const { groups } = await parseSwaggerUrl(options.swaggerUrl);
      
      // Flatten all endpoints
      const allEndpoints: Endpoint[] = [];
      for (const group of groups) {
        allEndpoints.push(...group.endpoints);
      }
      
      console.log(`✅ Found ${allEndpoints.length} total endpoints`);
      console.log('');
      
      // Create analyzer
      const analyzer = new CoverageAnalyzer(allEndpoints);
      
      // Load test results if provided
      if (options.testResults && existsSync(options.testResults)) {
        console.log(`📊 Loading test results from: ${options.testResults}`);
        
        try {
          const xmlContent = readFileSync(options.testResults, 'utf-8');
          const testResults = parseJUnitXML(xmlContent);
          
          testResults.forEach(result => {
            analyzer.addTestResult(result.path, result.method, result.passed);
          });
          
          console.log(`✅ Loaded ${testResults.length} test results`);
          console.log('');
        } catch (error: any) {
          console.log(`⚠️  Could not parse test results: ${error.message}`);
          console.log('');
        }
      } else {
        console.log('ℹ️  No test results provided - showing endpoint analysis only');
        console.log('');
      }
      
      // Generate report
      const stats = analyzer.analyze();
      
      // Output to console
      if (options.format === 'console' || options.format === 'both') {
        const consoleReport = analyzer.generateReport(stats);
        console.log(consoleReport);
      }
      
      // Output to markdown
      if (options.format === 'markdown' || options.format === 'both') {
        const markdownReport = analyzer.exportToMarkdown(stats);
        const outputPath = join(process.cwd(), 'api-coverage-report.md');
        writeFileSync(outputPath, markdownReport, 'utf-8');
        console.log('');
        console.log(`📄 Markdown report saved to: ${outputPath}`);
      }
      
      // Summary
      console.log('');
      console.log('📈 SUMMARY:');
      const getPercent = stats.byMethod.GET > 0 ? Math.round((stats.getResults.passing / stats.byMethod.GET) * 100) : 0;
      console.log(`   Total Endpoints: ${stats.total}`);
      console.log(`   GET Coverage: ${stats.getResults.passing}/${stats.byMethod.GET} (${getPercent}%)`);
      console.log(`   POST Endpoints: ${stats.byMethod.POST} (require request bodies)`);
      console.log(`   DELETE Endpoints: ${stats.byMethod.DELETE} (${stats.deleteResults.working} working)`);
      console.log('');
      
      process.exit(0);
      
    } catch (error: any) {
      console.error('');
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

/**
 * Helper: Parse JUnit XML to extract test results
 */
function parseJUnitXML(xmlContent: string): Array<{ path: string; method: string; passed: boolean }> {
  const results: Array<{ path: string; method: string; passed: boolean }> = [];
  
  // Simple XML parsing - look for testcase elements
  const testcaseRegex = /<testcase[^>]*name="([^"]*)"[^>]*>/g;
  
  let match;
  while ((match = testcaseRegex.exec(xmlContent)) !== null) {
    const testName = match[1];
    const testcaseStart = match.index;
    
    // Find the end of this testcase
    const testcaseEnd = xmlContent.indexOf('</testcase>', testcaseStart);
    if (testcaseEnd === -1) continue;
    
    const testcaseContent = xmlContent.substring(testcaseStart, testcaseEnd);
    
    // Check if it has a failure
    const hasFailed = testcaseContent.includes('<failure');
    
    // Parse test name (format: "METHOD /path" or just path)
    const methodMatch = testName.match(/^(GET|POST|PUT|DELETE|PATCH)\s+(.+)$/);
    if (methodMatch) {
      results.push({
        method: methodMatch[1],
        path: methodMatch[2],
        passed: !hasFailed
      });
    } else {
      // Assume GET if no method prefix
      results.push({
        method: 'GET',
        path: testName,
        passed: !hasFailed
      });
    }
  }
  
  return results;
}

/**
 * Helper: Get color/symbol for HTTP method
 */
function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return '🟢';
    case 'POST':
      return '🔵';
    case 'PUT':
    case 'PATCH':
      return '🟡';
    case 'DELETE':
      return '🔴';
    default:
      return '⚪';
  }
}

// Parse and execute
program.parse();

