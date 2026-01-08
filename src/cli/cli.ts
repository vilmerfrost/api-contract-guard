#!/usr/bin/env node

import { Command } from 'commander';
import { AzureVMStarter } from './azure-starter.js';
import { TestOrchestrator } from './orchestrator.js';
import { writeJUnitReport } from './junit-reporter.js';
import { parseSwaggerUrl } from '../lib/swagger.js';
import { filterBlacklistedEndpoints } from './blacklist.js';
import { AuthConfig } from '../types/index.js';

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
        useHierarchical: options.useHierarchical
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

