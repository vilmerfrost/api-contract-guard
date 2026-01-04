import { parseSwaggerUrl } from '../lib/swagger.js';
import { runEndpointTest } from '../lib/tester.js';
import { filterBlacklistedEndpoints } from './blacklist.js';
import { EndpointGroup, AuthConfig, TestResult } from '../types/index.js';

export interface OrchestratorOptions {
  swaggerUrl: string;
  auth?: AuthConfig;
  mode?: 'full' | 'readonly';
  parallel?: boolean;
  maxParallel?: number;
}

export interface OrchestratorResult {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
}

/**
 * Test Orchestrator
 * 
 * Coordinates the execution of all API tests:
 * - Parses OpenAPI/Swagger spec
 * - Filters blacklisted endpoints
 * - Runs tests (sequentially or in parallel)
 * - Aggregates results
 */
export class TestOrchestrator {
  private options: OrchestratorOptions;
  
  constructor(options: OrchestratorOptions) {
    this.options = options;
  }
  
  /**
   * Run all tests
   */
  async runAll(): Promise<OrchestratorResult> {
    const startTime = Date.now();
    
    console.log(`📋 Parsing Swagger from: ${this.options.swaggerUrl}`);
    
    // Parse Swagger
    const { groups, baseUrl } = await parseSwaggerUrl(this.options.swaggerUrl);
    
    console.log(`✅ Found ${groups.length} endpoint groups`);
    console.log(`🔗 Base URL: ${baseUrl}`);
    
    // Filter blacklisted endpoints
    const filteredGroups = groups.map(group => ({
      ...group,
      endpoints: filterBlacklistedEndpoints(group.endpoints)
    })).filter(group => group.endpoints.length > 0);
    
    const totalEndpoints = groups.reduce((sum, g) => sum + g.endpoints.length, 0);
    const filteredEndpoints = filteredGroups.reduce((sum, g) => sum + g.endpoints.length, 0);
    const skipped = totalEndpoints - filteredEndpoints;
    
    console.log(`✅ Testing ${filteredEndpoints} endpoints (${skipped} blacklisted)`);
    console.log('');
    
    // Run tests
    const results: TestResult[] = [];
    
    if (this.options.parallel) {
      results.push(...await this.runParallel(baseUrl, filteredGroups));
    } else {
      results.push(...await this.runSequential(baseUrl, filteredGroups));
    }
    
    const duration = Date.now() - startTime;
    
    // Aggregate results
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    return {
      total: filteredEndpoints,
      passed,
      failed,
      skipped,
      duration,
      results
    };
  }
  
  /**
   * Run tests sequentially (one at a time)
   */
  private async runSequential(
    baseUrl: string,
    groups: EndpointGroup[]
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];
    let current = 1;
    const total = groups.length;
    
    for (const group of groups) {
      console.log(`[${current}/${total}] Testing: ${group.resource}`);
      
      try {
        const result = await runEndpointTest(
          baseUrl,
          group,
          this.options.auth,
          (step) => {
            // Log each step
            if (step.error) {
              console.log(`  ❌ ${step.step}: ${step.error}`);
            } else if (step.status) {
              console.log(`  ✓ ${step.step}: ${step.status}`);
            }
          },
          { mode: this.options.mode }
        );
        
        results.push(result);
        
        if (result.passed) {
          console.log(`  ✅ PASSED (${result.duration}ms)`);
        } else {
          console.log(`  ❌ FAILED (${result.differences?.length || 0} differences)`);
        }
      } catch (error: any) {
        console.log(`  ❌ ERROR: ${error.message}`);
        results.push({
          resource: group.resource,
          steps: [],
          passed: false,
          differences: [{ path: 'error', expected: 'success', actual: error.message, type: 'changed' }],
          duration: 0
        });
      }
      
      console.log('');
      current++;
    }
    
    return results;
  }
  
  /**
   * Run tests in parallel (with concurrency limit)
   */
  private async runParallel(
    baseUrl: string,
    groups: EndpointGroup[]
  ): Promise<TestResult[]> {
    const maxParallel = this.options.maxParallel || 5;
    const results: TestResult[] = [];
    
    console.log(`🚀 Running tests in parallel (max ${maxParallel} concurrent)`);
    console.log('');
    
    // Process in batches
    for (let i = 0; i < groups.length; i += maxParallel) {
      const batch = groups.slice(i, i + maxParallel);
      
      const batchPromises = batch.map(async (group) => {
        try {
          return await runEndpointTest(
            baseUrl, 
            group, 
            this.options.auth,
            undefined,
            { mode: this.options.mode }
          );
        } catch (error: any) {
          return {
            resource: group.resource,
            steps: [],
            passed: false,
            differences: [{ path: 'error', expected: 'success', actual: error.message, type: 'changed' }],
            duration: 0
          } as TestResult;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Log batch completion
      batchResults.forEach((result, idx) => {
        const symbol = result.passed ? '✅' : '❌';
        console.log(`${symbol} ${batch[idx].resource} (${result.duration}ms)`);
      });
      console.log('');
    }
    
    return results;
  }
  
  /**
   * Print summary
   */
  printSummary(result: OrchestratorResult): void {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('           TEST SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Total:     ${result.total}`);
    console.log(`Passed:    ${result.passed} ✅`);
    console.log(`Failed:    ${result.failed} ❌`);
    console.log(`Skipped:   ${result.skipped} ⊘`);
    console.log(`Duration:  ${(result.duration / 1000).toFixed(2)}s`);
    console.log('═══════════════════════════════════════');
    console.log('');
    
    if (result.failed > 0) {
      console.log('Failed Tests:');
      result.results.filter(r => !r.passed).forEach(r => {
        console.log(`  ❌ ${r.resource}`);
        if (r.differences && r.differences.length > 0) {
          r.differences.slice(0, 3).forEach(d => {
            console.log(`     - ${d.path}: ${d.type}`);
          });
          if (r.differences.length > 3) {
            console.log(`     ... and ${r.differences.length - 3} more`);
          }
        }
      });
      console.log('');
    }
  }
}

