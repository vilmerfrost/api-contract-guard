/**
 * POST Endpoint Tester
 * 
 * Specialized test runner for POST endpoints using predefined test fixtures.
 * Follows the flow: AUTH -> POST -> VERIFY -> VALIDATE -> CLEANUP
 */

import { AxiosRequestConfig } from 'axios';
import { TestStep, TestResult, AuthConfig } from '@/types';
import { createAxiosInstance } from './utils.js';
import { PostTestCase, buildUrl } from './test-fixtures.js';

const axios = createAxiosInstance();

/**
 * Get OAuth2 access token using password grant flow
 */
async function getOAuth2Token(
  tokenUrl: string,
  username: string,
  password: string
): Promise<string> {
  const params = new URLSearchParams();
  const grantType = process.env.GRANT_TYPE || 'password';
  
  params.append('grant_type', grantType);
  
  if (grantType === 'password') {
    params.append('username', username);
    params.append('password', password);
  }

  const response = await axios.post(
    tokenUrl,
    params.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  if (response.status !== 200) {
    throw new Error(`Failed to fetch access token: ${response.status} ${response.statusText}`);
  }

  const accessToken = response.data?.access_token;
  if (!accessToken) {
    throw new Error('Access token is null');
  }

  return accessToken;
}

export interface PostTestOptions {
  /** Base URL for the API */
  baseUrl: string;
  /** Skip cleanup step */
  skipCleanup?: boolean;
  /** Skip verification step */
  skipVerify?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
}

export interface PostTestResult extends TestResult {
  /** The test case that was run */
  testCase: PostTestCase;
  /** Whether cleanup was successful */
  cleanupSuccess?: boolean;
}

/**
 * Run a single POST endpoint test using predefined fixtures
 */
export async function runPostEndpointTest(
  testCase: PostTestCase,
  auth: AuthConfig,
  options: PostTestOptions,
  onStepComplete?: (step: TestStep) => void
): Promise<PostTestResult> {
  const steps: TestStep[] = [];
  const startTime = Date.now();
  const timeout = options.timeout || 30000;
  
  const addStep = (step: TestStep) => {
    steps.push(step);
    onStepComplete?.(step);
  };

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Step 1: AUTH
  if (auth?.type === 'oauth2' && auth.username && auth.password && auth.tokenUrl) {
    try {
      const token = await getOAuth2Token(auth.tokenUrl, auth.username, auth.password);
      headers['Authorization'] = `Bearer ${token}`;
      
      addStep({
        step: 'AUTH',
        method: 'POST',
        url: auth.tokenUrl,
        status: 200,
        timestamp: new Date(),
      });
    } catch (error: any) {
      const statusCode = error.response?.status || 0;
      const errorMsg = `OAuth2 authentication failed: ${error.message}`;
      
      addStep({
        step: 'AUTH',
        method: 'POST',
        url: auth.tokenUrl,
        status: statusCode,
        error: errorMsg,
        timestamp: new Date(),
      });
      
      console.error(`  [FAIL] AUTH: ${auth.tokenUrl} [${statusCode}] - ${errorMsg}`);
      
      return {
        resource: testCase.endpoint,
        testCase,
        steps,
        passed: false,
        differences: [{ path: 'auth', expected: 'success', actual: 'failed', type: 'changed' }],
        duration: Date.now() - startTime,
      };
    }
  } else if (auth?.type === 'bearer' && auth.token) {
    headers['Authorization'] = `Bearer ${auth.token}`;
  } else if (auth?.type === 'apikey' && auth.token) {
    headers['X-API-Key'] = auth.token;
  }

  const config: AxiosRequestConfig = { headers, timeout };

  // Build the POST URL
  const postPath = buildUrl(testCase.endpoint, testCase.pathParams);
  const postUrl = `${options.baseUrl}${postPath}`;

  // Step 2: POST
  let postResponse: any = null;
  let postSuccess = false;
  
  try {
    postResponse = await axios.post(postUrl, testCase.requestBody, config);
    postSuccess = postResponse.status === testCase.expectedStatus;
    
    addStep({
      step: 'POST',
      method: 'POST',
      url: postUrl,
      status: postResponse.status,
      data: postResponse.data,
      timestamp: new Date(),
    });
    
    if (postSuccess) {
      console.log(`  [PASS] POST: ${postUrl} [${postResponse.status}]`);
    } else {
      console.warn(`  [WARN] POST: ${postUrl} [${postResponse.status}] - Expected ${testCase.expectedStatus}`);
    }
  } catch (error: any) {
    const statusCode = error.response?.status || 0;
    const errorMsg = error.response?.data?.message || error.response?.data?.detail || error.message;
    
    addStep({
      step: 'POST',
      method: 'POST',
      url: postUrl,
      status: statusCode,
      data: testCase.requestBody,
      error: errorMsg,
      timestamp: new Date(),
    });
    
    console.error(`  [FAIL] POST: ${postUrl} [${statusCode}] - ${errorMsg}`);
    
    // If POST failed, skip verify and cleanup
    return {
      resource: testCase.endpoint,
      testCase,
      steps,
      passed: false,
      differences: [{ path: 'post', expected: testCase.expectedStatus, actual: statusCode, type: 'changed' }],
      duration: Date.now() - startTime,
    };
  }

  // Step 3: VERIFY (optional)
  let verifySuccess = true;
  
  if (!options.skipVerify && testCase.verifyEndpoint) {
    const verifyPath = buildUrl(testCase.verifyEndpoint, testCase.pathParams);
    const verifyUrl = `${options.baseUrl}${verifyPath}`;
    
    try {
      const verifyResponse = await axios.get(verifyUrl, config);
      
      addStep({
        step: 'VERIFY',
        method: 'GET',
        url: verifyUrl,
        status: verifyResponse.status,
        data: verifyResponse.data,
        timestamp: new Date(),
      });
      
      console.log(`  [PASS] VERIFY: ${verifyUrl} [${verifyResponse.status}]`);
    } catch (error: any) {
      const statusCode = error.response?.status || 0;
      const errorMsg = error.message;
      verifySuccess = false;
      
      addStep({
        step: 'VERIFY',
        method: 'GET',
        url: verifyUrl,
        status: statusCode,
        error: errorMsg,
        timestamp: new Date(),
      });
      
      console.warn(`  [WARN] VERIFY: ${verifyUrl} [${statusCode}] - ${errorMsg}`);
    }
  }

  // Step 4: VALIDATE (custom validation function)
  let validateSuccess = true;
  
  if (testCase.validateResponse && postResponse) {
    try {
      validateSuccess = testCase.validateResponse(postResponse.data);
      
      addStep({
        step: 'VALIDATE',
        data: { valid: validateSuccess },
        timestamp: new Date(),
      });
      
      if (validateSuccess) {
        console.log(`  [PASS] VALIDATE: Custom validation passed`);
      } else {
        console.warn(`  [WARN] VALIDATE: Custom validation failed`);
      }
    } catch (error: any) {
      validateSuccess = false;
      
      addStep({
        step: 'VALIDATE',
        error: error.message,
        timestamp: new Date(),
      });
      
      console.warn(`  [WARN] VALIDATE: ${error.message}`);
    }
  }

  // Step 5: CLEANUP (optional)
  let cleanupSuccess = true;
  
  if (!options.skipCleanup && testCase.cleanupEndpoint) {
    const cleanupPath = buildUrl(testCase.cleanupEndpoint, testCase.pathParams);
    const cleanupUrl = `${options.baseUrl}${cleanupPath}`;
    
    try {
      const cleanupConfig = testCase.cleanupBody 
        ? { ...config, data: testCase.cleanupBody }
        : config;
      
      const cleanupResponse = await axios.delete(cleanupUrl, cleanupConfig);
      
      addStep({
        step: 'CLEANUP',
        method: 'DELETE',
        url: cleanupUrl,
        status: cleanupResponse.status,
        timestamp: new Date(),
      });
      
      console.log(`  [PASS] CLEANUP: ${cleanupUrl} [${cleanupResponse.status}]`);
    } catch (error: any) {
      const statusCode = error.response?.status || 0;
      const errorMsg = error.message;
      cleanupSuccess = false;
      
      addStep({
        step: 'CLEANUP',
        method: 'DELETE',
        url: cleanupUrl,
        status: statusCode,
        error: errorMsg,
        timestamp: new Date(),
      });
      
      // Cleanup failure is not a test failure, just a warning
      console.warn(`  [WARN] CLEANUP: ${cleanupUrl} [${statusCode}] - ${errorMsg}`);
    }
  }

  const passed = postSuccess && verifySuccess && validateSuccess;
  const differences: any[] = [];
  
  if (!postSuccess) {
    differences.push({ path: 'post.status', expected: testCase.expectedStatus, actual: postResponse?.status, type: 'changed' });
  }
  if (!verifySuccess) {
    differences.push({ path: 'verify', expected: 'success', actual: 'failed', type: 'changed' });
  }
  if (!validateSuccess) {
    differences.push({ path: 'validate', expected: 'success', actual: 'failed', type: 'changed' });
  }

  return {
    resource: testCase.endpoint,
    testCase,
    steps,
    passed,
    differences,
    duration: Date.now() - startTime,
    cleanupSuccess,
  };
}

/**
 * Run multiple POST endpoint tests
 */
export async function runPostEndpointTests(
  testCases: PostTestCase[],
  auth: AuthConfig,
  options: PostTestOptions,
  onTestComplete?: (result: PostTestResult) => void
): Promise<PostTestResult[]> {
  const results: PostTestResult[] = [];
  const completedEndpoints = new Set<string>();
  
  // Sort by priority
  const sortedCases = [...testCases].sort((a, b) => (a.priority || 99) - (b.priority || 99));
  
  for (const testCase of sortedCases) {
    // Check dependencies
    if (testCase.dependsOn) {
      const missingDeps = testCase.dependsOn.filter(dep => !completedEndpoints.has(dep));
      if (missingDeps.length > 0) {
        console.warn(`Skipping ${testCase.endpoint} - missing dependencies: ${missingDeps.join(', ')}`);
        continue;
      }
    }
    
    console.log(`\nTesting: ${testCase.endpoint}`);
    console.log(`  Description: ${testCase.description}`);
    
    const result = await runPostEndpointTest(
      testCase,
      auth,
      options,
      (step) => {
        // Optional step-by-step logging
      }
    );
    
    results.push(result);
    
    if (result.passed) {
      completedEndpoints.add(testCase.endpoint);
    }
    
    onTestComplete?.(result);
  }
  
  return results;
}

/**
 * Generate summary of POST test results
 */
export function generatePostTestSummary(results: PostTestResult[]): {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  byModule: Record<string, { total: number; passed: number; failed: number }>;
  failedTests: PostTestResult[];
} {
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const passRate = total > 0 ? (passed / total) * 100 : 0;
  
  const byModule: Record<string, { total: number; passed: number; failed: number }> = {};
  
  for (const result of results) {
    const module = result.testCase.module;
    if (!byModule[module]) {
      byModule[module] = { total: 0, passed: 0, failed: 0 };
    }
    byModule[module].total++;
    if (result.passed) {
      byModule[module].passed++;
    } else {
      byModule[module].failed++;
    }
  }
  
  const failedTests = results.filter(r => !r.passed);
  
  return {
    total,
    passed,
    failed,
    passRate,
    byModule,
    failedTests,
  };
}

/**
 * Print POST test summary to console
 */
export function printPostTestSummary(results: PostTestResult[]): void {
  const summary = generatePostTestSummary(results);
  
  console.log('\n' + '='.repeat(70));
  console.log('POST ENDPOINT TEST SUMMARY');
  console.log('='.repeat(70));
  
  console.log(`\nOverall: ${summary.passed}/${summary.total} passed (${summary.passRate.toFixed(1)}%)`);
  
  console.log('\nBy Module:');
  for (const [module, stats] of Object.entries(summary.byModule)) {
    const rate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : '0.0';
    const status = stats.failed === 0 ? '[PASS]' : '[FAIL]';
    console.log(`  ${status} ${module}: ${stats.passed}/${stats.total} (${rate}%)`);
  }
  
  if (summary.failedTests.length > 0) {
    console.log('\nFailed Tests:');
    for (const result of summary.failedTests) {
      console.log(`  - ${result.testCase.endpoint}`);
      for (const diff of result.differences) {
        console.log(`    ${diff.path}: expected ${diff.expected}, got ${diff.actual}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(70));
}
