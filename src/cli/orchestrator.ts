import { parseSwaggerUrl } from '../lib/swagger.js';
import { runEndpointTest } from '../lib/tester.js';
import { filterBlacklistedEndpoints, isEndpointExcluded } from './blacklist.js';
import { discoverTestData, discoverHierarchicalTestData, TestDataCache, HierarchicalTestData } from '../lib/data-discovery.js';
import { findParentApiDefinition, getChildApiPaths, isChildApi } from '../lib/hierarchical-apis.js';
import { Endpoint, EndpointGroup, AuthConfig, TestResult } from '../types/index.js';
import { 
  POST_TEST_CASES, 
  PostTestCase, 
  getTestCasesByModule,
  buildUrl 
} from '../lib/test-fixtures.js';
import { 
  runPostEndpointTests, 
  printPostTestSummary, 
  PostTestResult,
  generatePostTestSummary
} from '../lib/post-endpoint-tester.js';

export interface OrchestratorOptions {
  swaggerUrl: string;
  auth?: AuthConfig;
  mode?: 'full' | 'readonly';
  parallel?: boolean;
  maxParallel?: number;
  useRealData?: boolean; // Enable real data discovery
  useHierarchical?: boolean; // Enable hierarchical parent-child API testing
  testPosts?: boolean; // Run POST endpoint tests with fixtures
  skipCleanup?: boolean; // Skip cleanup step in POST fixture tests
  skipVerify?: boolean; // Skip verification step in POST fixture tests
  postModule?: string; // Only run POST tests for specific module
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
    
    // Discover real test data if enabled
    let testDataCache: TestDataCache | undefined;
    let hierarchicalData: HierarchicalTestData[] | undefined;
    
    if (this.options.useHierarchical) {
      // Hierarchical mode: discover parent-child relationships
      try {
        hierarchicalData = await discoverHierarchicalTestData(baseUrl, this.options.auth);
      } catch (error: any) {
        console.warn(`⚠️  Hierarchical data discovery failed: ${error.message}`);
        console.warn(`   Falling back to standard testing`);
        console.log('');
      }
    } else if (this.options.useRealData) {
      // Standard mode: discover real IDs
      try {
        testDataCache = await discoverTestData(baseUrl, this.options.auth);
      } catch (error: any) {
        console.warn(`⚠️  Data discovery failed: ${error.message}`);
        console.warn(`   Falling back to placeholder IDs`);
        console.log('');
      }
    }
    
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
    
    if (this.options.useHierarchical && hierarchicalData) {
      // Hierarchical mode: test parent APIs and loop through child APIs
      console.log('🔄 Running hierarchical tests (parent → child loop)');
      console.log('');
      results.push(...await this.runHierarchical(baseUrl, filteredGroups, hierarchicalData));
    } else {
      // Standard mode: test endpoints normally
      // Print all URLs that will be tested
      await this.printTestUrls(baseUrl, filteredGroups, this.options.mode || 'full', testDataCache);
      console.log('');
      
      if (this.options.parallel) {
        results.push(...await this.runParallel(baseUrl, filteredGroups, testDataCache));
      } else {
        results.push(...await this.runSequential(baseUrl, filteredGroups, testDataCache));
      }
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
    groups: EndpointGroup[],
    testDataCache?: TestDataCache
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    // Flatten all endpoints from all groups
    const allEndpoints: Array<{ endpoint: Endpoint; groupResource: string }> = [];
    for (const group of groups) {
      for (const endpoint of group.endpoints) {
        // READONLY MODE: Skip non-GET endpoints entirely
        if (this.options.mode === 'readonly' && endpoint.method !== 'GET') {
          continue;
        }
        
        allEndpoints.push({ endpoint, groupResource: group.resource });
      }
    }
    
    let current = 1;
    const total = allEndpoints.length;
    
    console.log(`📊 Testing ${total} endpoints (${this.options.mode === 'readonly' ? 'readonly mode - GET only' : 'full CRUD mode'})`);
    console.log('');
    
    for (const { endpoint, groupResource } of allEndpoints) {
      const fullPath = `${endpoint.method} ${endpoint.path}`;
      console.log(`[${current}/${total}] Testing: ${fullPath}`);
      
      try {
        // Create a temporary group with just this one endpoint
        const singleEndpointGroup: EndpointGroup = {
          resource: endpoint.path,
          endpoints: [endpoint]
        };
        
        const result = await runEndpointTest(
          baseUrl,
          singleEndpointGroup,
          this.options.auth,
          (step) => {
            // Log each step with detailed error information
            if (step.error) {
              const statusInfo = step.status ? ` [${step.status}]` : '';
              console.log(`  ❌ ${step.step}${statusInfo}: ${step.url || endpoint.path}`);
              console.log(`     Error: ${step.error}`);
            } else if (step.status) {
              const statusSymbol = step.status >= 200 && step.status < 300 ? '✓' : '⚠';
              console.log(`  ${statusSymbol} ${step.step}: ${step.status} - ${step.url || endpoint.path}`);
            }
          },
          { mode: this.options.mode, testDataCache }
        );
        
        results.push(result);
        
        if (result.passed) {
          console.log(`  ✅ PASSED (${result.duration}ms)`);
        } else {
          console.log(`  ❌ FAILED`);
          
          // Log all failed steps with full details
          const failedSteps = result.steps.filter(s => s.error || (s.status && (s.status < 200 || s.status >= 400)));
          if (failedSteps.length > 0) {
            console.log(`     Failed requests:`);
            failedSteps.forEach(step => {
              const statusInfo = step.status ? `[${step.status}]` : '[ERROR]';
              const url = step.url || endpoint.path;
              const method = step.method || step.step;
              console.log(`       ${method} ${url} ${statusInfo}`);
              if (step.error) {
                console.log(`       └─ ${step.error}`);
              }
            });
          }
          
          if (result.differences && result.differences.length > 0) {
            console.log(`     Differences: ${result.differences.length}`);
          }
        }
      } catch (error: any) {
        console.log(`  ❌ ERROR: ${error.message}`);
        results.push({
          resource: endpoint.path,
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
    groups: EndpointGroup[],
    testDataCache?: TestDataCache
  ): Promise<TestResult[]> {
    const maxParallel = this.options.maxParallel || 5;
    const results: TestResult[] = [];
    
    // Flatten all endpoints from all groups
    const allEndpoints: Array<{ endpoint: Endpoint; groupResource: string }> = [];
    for (const group of groups) {
      for (const endpoint of group.endpoints) {
        // READONLY MODE: Skip non-GET endpoints entirely
        if (this.options.mode === 'readonly' && endpoint.method !== 'GET') {
          continue;
        }
        
        allEndpoints.push({ endpoint, groupResource: group.resource });
      }
    }
    
    console.log(`📊 Testing ${allEndpoints.length} endpoints (${this.options.mode === 'readonly' ? 'readonly mode - GET only' : 'full CRUD mode'})`);
    console.log(`🚀 Running tests in parallel (max ${maxParallel} concurrent)`);
    console.log('');
    
    // Process in batches
    for (let i = 0; i < allEndpoints.length; i += maxParallel) {
      const batch = allEndpoints.slice(i, i + maxParallel);
      
      const batchPromises = batch.map(async ({ endpoint, groupResource }) => {
        try {
          // Create a temporary group with just this one endpoint
          const singleEndpointGroup: EndpointGroup = {
            resource: endpoint.path,
            endpoints: [endpoint]
          };
          
          return await runEndpointTest(
            baseUrl, 
            singleEndpointGroup, 
            this.options.auth,
            undefined,
            { mode: this.options.mode, testDataCache }
          );
        } catch (error: any) {
          return {
            resource: endpoint.path,
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
        const fullPath = `${batch[idx].endpoint.method} ${batch[idx].endpoint.path}`;
        console.log(`${symbol} ${fullPath} (${result.duration}ms)`);
      });
      console.log('');
    }
    
    return results;
  }
  
  /**
   * Print all URLs that will be tested
   */
  private async printTestUrls(baseUrl: string, groups: EndpointGroup[], mode: 'full' | 'readonly', testDataCache?: TestDataCache): Promise<void> {
    console.log('═══════════════════════════════════════');
    console.log('        ALL TESTABLE ENDPOINTS');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log(`Base URL: ${baseUrl}`);
    console.log(`Mode: ${mode === 'full' ? 'Full CRUD' : 'Readonly (GET only)'}`);
    if (testDataCache) {
      console.log(`Data: Using real IDs from API ✨`);
    } else {
      console.log(`Data: Using placeholder IDs (1)`);
    }
    console.log('');
    
    // Collect all endpoints that will be tested
    const allTestUrls: Array<{ method: string; url: string; path: string; summary?: string; group: string }> = [];
    
    for (const group of groups) {
      for (const endpoint of group.endpoints) {
        // Replace path parameters with real IDs or placeholder
        let testPath: string;
        if (testDataCache) {
          // Import substitutePathParameters dynamically
          const { substitutePathParameters } = await import('../lib/data-discovery.js');
          testPath = substitutePathParameters(endpoint.path, testDataCache);
        } else {
          testPath = endpoint.path.replace(/\{[^}]+\}/g, '1');
        }
        
        const fullUrl = `${baseUrl}${testPath}`;
        
        // In readonly mode, only GET endpoints are tested
        if (mode === 'readonly' && endpoint.method !== 'GET') {
          continue;
        }
        
        allTestUrls.push({
          method: endpoint.method,
          url: fullUrl,
          path: endpoint.path,
          summary: endpoint.summary,
          group: group.resource
        });
      }
    }
    
    // Print all URLs grouped by resource
    let currentGroup = '';
    let urlIndex = 1;
    
    for (const { method, url, path, summary, group } of allTestUrls) {
      if (group !== currentGroup) {
        if (currentGroup !== '') {
          console.log('');
        }
        console.log(`📁 ${group}`);
        console.log('─'.repeat(70));
        currentGroup = group;
      }
      
      const methodColor = method === 'GET' ? '🟢' : method === 'POST' ? '🔵' : method === 'DELETE' ? '🔴' : method === 'PUT' ? '🟡' : '⚪';
      
      console.log(`  ${methodColor} ${method.padEnd(6)} ${url}`);
      if (path !== url.replace(baseUrl, '')) {
        console.log(`      Path: ${path}`);
      }
      if (summary) {
        console.log(`      ${summary}`);
      }
      urlIndex++;
    }
    
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log(`Total URLs to test: ${allTestUrls.length}`);
    if (mode === 'full') {
      console.log('Note: Full CRUD mode will perform GET → DELETE → POST → VERIFY for each endpoint group');
    } else {
      console.log('Note: Readonly mode will only perform GET requests');
    }
    console.log('═══════════════════════════════════════');
  }
  
  /**
   * Run hierarchical tests (parent-child loop)
   * Tests parent APIs first, then loops through all resources to test child APIs
   */
  private async runHierarchical(
    baseUrl: string,
    groups: EndpointGroup[],
    hierarchicalData: HierarchicalTestData[]
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];
    let testCount = 1;
    
    // Calculate total tests
    const totalTests = hierarchicalData.reduce((sum, data) => {
      return sum + 1 + (data.resources.length * data.childApiCount); // 1 parent + (resources × children)
    }, 0);
    
    console.log(`📊 Total hierarchical tests: ${totalTests}`);
    console.log('');
    
    for (const parentData of hierarchicalData) {
      console.log('═══════════════════════════════════════');
      console.log(`  TESTING: ${parentData.description}`);
      console.log(`  Parent: ${parentData.parentPath}`);
      console.log(`  Resources: ${parentData.resources.length}`);
      console.log(`  Child APIs per resource: ${parentData.childApiCount}`);
      console.log('═══════════════════════════════════════');
      console.log('');
      
      // Step 1: Test the parent API
      console.log(`[${testCount}/${totalTests}] Testing parent: GET ${parentData.parentPath}`);
      testCount++;
      
      try {
        // Find the parent endpoint in groups
        const parentEndpoint = this.findEndpointByPath(groups, parentData.parentPath);
        
        if (parentEndpoint) {
          const singleEndpointGroup: EndpointGroup = {
            resource: parentData.parentPath,
            endpoints: [parentEndpoint]
          };
          
          const result = await runEndpointTest(
            baseUrl,
            singleEndpointGroup,
            this.options.auth,
            (step) => {
              if (step.error) {
                const statusInfo = step.status ? ` [${step.status}]` : '';
                console.log(`  ❌ ${step.step}${statusInfo}: ${step.url || parentData.parentPath}`);
                console.log(`     Error: ${step.error}`);
              } else if (step.status) {
                const statusSymbol = step.status >= 200 && step.status < 300 ? '✓' : '⚠';
                console.log(`  ${statusSymbol} ${step.step}: ${step.status}`);
              }
            },
            { mode: this.options.mode }
          );
          
          results.push(result);
          
          if (result.passed) {
            console.log(`  ✅ PASSED (${result.duration}ms)`);
          } else {
            console.log(`  ❌ FAILED`);
          }
        } else {
          console.log(`  ⚠️  Parent endpoint not found in Swagger spec`);
        }
      } catch (error: any) {
        console.log(`  ❌ ERROR: ${error.message}`);
      }
      
      console.log('');
      
      // Step 2: Loop through all resources and test child APIs
      for (const resource of parentData.resources) {
        const displayName = resource.name ? `${resource.id} (${resource.name})` : resource.id;
        console.log(`📋 Testing child APIs for resource: ${displayName}`);
        console.log('');
        
        // Get all child API paths for this resource
        const parentDefinition = findParentApiDefinition(parentData.parentPath);
        if (!parentDefinition) continue;
        
        const childPaths = getChildApiPaths(parentDefinition, resource.id);
        
        // Test each child API
        for (const childPath of childPaths) {
          console.log(`[${testCount}/${totalTests}] Testing: GET ${childPath.path}`);
          testCount++;
          
          try {
            // Find the child endpoint in groups (try to match by pattern)
            const childEndpoint = this.findEndpointByPath(groups, childPath.path);
            
            if (childEndpoint) {
              const singleEndpointGroup: EndpointGroup = {
                resource: childPath.path,
                endpoints: [childEndpoint]
              };
              
              const result = await runEndpointTest(
                baseUrl,
                singleEndpointGroup,
                this.options.auth,
                (step) => {
                  if (step.error) {
                    const statusInfo = step.status ? ` [${step.status}]` : '';
                    console.log(`  ❌ ${step.step}${statusInfo}: ${step.url || childPath.path}`);
                    console.log(`     Error: ${step.error}`);
                  } else if (step.status) {
                    const statusSymbol = step.status >= 200 && step.status < 300 ? '✓' : '⚠';
                    console.log(`  ${statusSymbol} ${step.step}: ${step.status}`);
                  }
                },
                { mode: this.options.mode }
              );
              
              results.push(result);
              
              if (result.passed) {
                console.log(`  ✅ PASSED (${result.duration}ms)`);
              } else {
                console.log(`  ❌ FAILED`);
              }
            } else {
              // Child endpoint not found - create a simple GET test
              console.log(`  ℹ️  Endpoint not in spec, testing directly...`);
              
              const endpoint: Endpoint = {
                method: 'GET',
                path: childPath.path,
                summary: childPath.description
              };
              
              const singleEndpointGroup: EndpointGroup = {
                resource: childPath.path,
                endpoints: [endpoint]
              };
              
              const result = await runEndpointTest(
                baseUrl,
                singleEndpointGroup,
                this.options.auth,
                (step) => {
                  if (step.error) {
                    const statusInfo = step.status ? ` [${step.status}]` : '';
                    console.log(`  ❌ ${step.step}${statusInfo}: ${step.url || childPath.path}`);
                    console.log(`     Error: ${step.error}`);
                  } else if (step.status) {
                    const statusSymbol = step.status >= 200 && step.status < 300 ? '✓' : '⚠';
                    console.log(`  ${statusSymbol} ${step.step}: ${step.status}`);
                  }
                },
                { mode: this.options.mode }
              );
              
              results.push(result);
              
              if (result.passed) {
                console.log(`  ✅ PASSED (${result.duration}ms)`);
              } else {
                console.log(`  ❌ FAILED`);
              }
            }
          } catch (error: any) {
            console.log(`  ❌ ERROR: ${error.message}`);
            results.push({
              resource: childPath.path,
              steps: [],
              passed: false,
              differences: [{ path: 'error', expected: 'success', actual: error.message, type: 'changed' }],
              duration: 0
            });
          }
          
          console.log('');
        }
      }
    }
    
    return results;
  }
  
  /**
   * Find an endpoint by path in groups
   * Matches both exact paths and paths with parameters
   */
  private findEndpointByPath(groups: EndpointGroup[], path: string): Endpoint | null {
    // Normalize path
    const normalizedPath = path.split('?')[0].replace(/\/$/, '');
    
    for (const group of groups) {
      for (const endpoint of group.endpoints) {
        const normalizedEndpointPath = endpoint.path.split('?')[0].replace(/\/$/, '');
        
        // Exact match
        if (normalizedEndpointPath === normalizedPath) {
          return endpoint;
        }
        
        // Pattern match (e.g., /api/v2/systems/{system} matches /api/v2/systems/SYS001)
        const regexPattern = normalizedEndpointPath.replace(/\{[^}]+\}/g, '[^/]+');
        const regex = new RegExp(`^${regexPattern}$`);
        
        if (regex.test(normalizedPath)) {
          // Create a copy of the endpoint with the actual path
          return {
            ...endpoint,
            path: normalizedPath
          };
        }
      }
    }
    
    return null;
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
      console.log('═══════════════════════════════════════');
      console.log('           FAILED REQUESTS');
      console.log('═══════════════════════════════════════');
      console.log('');
      
      result.results.filter(r => !r.passed).forEach(r => {
        console.log(`❌ ${r.resource}`);
        
        // Log all failed steps with full URL and status code
        const failedSteps = r.steps.filter(s => s.error || (s.status && (s.status < 200 || s.status >= 400)));
        if (failedSteps.length > 0) {
          failedSteps.forEach(step => {
            const statusInfo = step.status ? `[${step.status}]` : '[ERROR]';
            const url = step.url || r.resource;
            const method = step.method || step.step;
            console.log(`   ${method.padEnd(7)} ${url} ${statusInfo}`);
            if (step.error) {
              console.log(`            └─ ${step.error}`);
            }
          });
        }
        
        // Log differences if any
        if (r.differences && r.differences.length > 0) {
          console.log(`   Differences: ${r.differences.length}`);
          r.differences.slice(0, 2).forEach(d => {
            console.log(`     • ${d.path}: ${d.type}`);
          });
          if (r.differences.length > 2) {
            console.log(`     ... and ${r.differences.length - 2} more`);
          }
        }
        
        console.log('');
      });
      
      console.log('═══════════════════════════════════════');
      console.log('');
    }
  }
  
  /**
   * Run POST endpoint tests with predefined fixtures
   */
  async runPostTests(): Promise<OrchestratorResult> {
    const startTime = Date.now();
    
    console.log(`📋 Running POST endpoint tests with fixtures`);
    
    // Parse Swagger to get base URL
    const { baseUrl } = await parseSwaggerUrl(this.options.swaggerUrl);
    console.log(`🔗 Base URL: ${baseUrl}`);
    
    // Get test cases (optionally filtered by module)
    let testCases = POST_TEST_CASES;
    
    if (this.options.postModule) {
      testCases = getTestCasesByModule(this.options.postModule);
      console.log(`🔍 Filtering to module: ${this.options.postModule}`);
    }
    
    // Filter out blacklisted endpoints
    const filteredCases = testCases.filter(tc => {
      const [method, ...pathParts] = tc.endpoint.split(' ');
      const path = pathParts.join(' ');
      return !isEndpointExcluded(method, path);
    });
    
    const skipped = testCases.length - filteredCases.length;
    
    console.log(`✅ Testing ${filteredCases.length} POST endpoints (${skipped} blacklisted)`);
    console.log('');
    
    // Print test cases that will be run
    console.log('═══════════════════════════════════════');
    console.log('        POST ENDPOINTS TO TEST');
    console.log('═══════════════════════════════════════');
    
    const byModule: Record<string, PostTestCase[]> = {};
    for (const tc of filteredCases) {
      if (!byModule[tc.module]) {
        byModule[tc.module] = [];
      }
      byModule[tc.module].push(tc);
    }
    
    for (const [module, cases] of Object.entries(byModule)) {
      console.log(`\n📁 ${module} (${cases.length} tests)`);
      console.log('─'.repeat(70));
      for (const tc of cases) {
        const url = buildUrl(tc.endpoint, tc.pathParams);
        console.log(`  🔵 POST   ${baseUrl}${url}`);
        console.log(`           ${tc.description}`);
      }
    }
    
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('');
    
    // Run tests
    const results = await runPostEndpointTests(
      filteredCases,
      this.options.auth!,
      {
        baseUrl,
        skipCleanup: this.options.skipCleanup,
        skipVerify: this.options.skipVerify,
        timeout: 30000
      },
      (result) => {
        // Optional: additional logging per test
      }
    );
    
    const duration = Date.now() - startTime;
    
    // Convert PostTestResult[] to TestResult[] for compatibility
    const testResults: TestResult[] = results.map(r => ({
      resource: r.resource,
      steps: r.steps,
      passed: r.passed,
      differences: r.differences,
      duration: r.duration
    }));
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    return {
      total: filteredCases.length,
      passed,
      failed,
      skipped,
      duration,
      results: testResults
    };
  }
  
  /**
   * Print POST test summary
   */
  printPostSummary(result: OrchestratorResult): void {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('       POST ENDPOINT TEST SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Total:     ${result.total}`);
    console.log(`Passed:    ${result.passed} ✅`);
    console.log(`Failed:    ${result.failed} ❌`);
    console.log(`Skipped:   ${result.skipped} ⊘`);
    console.log(`Duration:  ${(result.duration / 1000).toFixed(2)}s`);
    
    const passRate = result.total > 0 ? ((result.passed / result.total) * 100).toFixed(1) : '0.0';
    console.log(`Pass Rate: ${passRate}%`);
    console.log('═══════════════════════════════════════');
    console.log('');
    
    if (result.failed > 0) {
      console.log('═══════════════════════════════════════');
      console.log('        FAILED POST ENDPOINTS');
      console.log('═══════════════════════════════════════');
      console.log('');
      
      result.results.filter(r => !r.passed).forEach(r => {
        console.log(`❌ ${r.resource}`);
        
        // Log all failed steps
        const failedSteps = r.steps.filter(s => s.error || (s.status && (s.status < 200 || s.status >= 400)));
        if (failedSteps.length > 0) {
          failedSteps.forEach(step => {
            const statusInfo = step.status ? `[${step.status}]` : '[ERROR]';
            const url = step.url || r.resource;
            const method = step.method || step.step;
            console.log(`   ${method.padEnd(7)} ${url} ${statusInfo}`);
            if (step.error) {
              console.log(`            └─ ${step.error}`);
            }
          });
        }
        
        // Log differences
        if (r.differences && r.differences.length > 0) {
          r.differences.forEach(d => {
            console.log(`     • ${d.path}: expected ${d.expected}, got ${d.actual}`);
          });
        }
        
        console.log('');
      });
      
      console.log('═══════════════════════════════════════');
      console.log('');
    }
  }
}

