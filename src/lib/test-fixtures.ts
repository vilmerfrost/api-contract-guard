/**
 * Test Fixtures for POST Endpoint Testing
 *
 * Predefined test cases with request bodies, path parameters,
 * and expected responses for POST endpoint regression tests.
 * All test resources use the `__test__` prefix to avoid polluting real data.
 */

import { PostTestCase } from '../types/index.js';

// Re-export PostTestCase so consumers can import from this module
export type { PostTestCase } from '../types/index.js';

/**
 * Build a URL from an endpoint pattern and path parameters.
 *
 * Takes an endpoint string like `"POST /api/v2/systems/{system}"`,
 * strips the HTTP method prefix, and substitutes `{key}` placeholders
 * with the corresponding values from `pathParams`.
 *
 * @param endpoint  - Endpoint pattern, e.g. "POST /api/v2/systems/{system}"
 * @param pathParams - Key/value map of path parameters
 * @returns The path portion with placeholders replaced
 */
export function buildUrl(
  endpoint: string,
  pathParams: Record<string, string>
): string {
  // Strip the HTTP method prefix (e.g. "POST ", "GET ") if present
  let path = endpoint.replace(/^[A-Z]+\s+/, '');

  // Substitute {key} placeholders with values from pathParams
  for (const [key, value] of Object.entries(pathParams)) {
    path = path.replace(`{${key}}`, encodeURIComponent(value));
  }

  return path;
}

/**
 * Filter POST_TEST_CASES by module name (case-insensitive).
 */
export function getTestCasesByModule(moduleName: string): PostTestCase[] {
  const lower = moduleName.toLowerCase();
  return POST_TEST_CASES.filter(
    (tc) => tc.module.toLowerCase() === lower
  );
}

/**
 * Predefined POST test cases covering the main PDQ API modules.
 */
export const POST_TEST_CASES: PostTestCase[] = [
  // ===========================
  // Systems
  // ===========================
  {
    endpoint: 'POST /api/v2/systems/{system}',
    description: 'Create a new test system',
    pathParams: { system: '__test__system' },
    requestBody: {
      system: '__test__system',
      description: 'Automated test system created by API contract guard',
    },
    expectedStatus: 200,
    verifyEndpoint: 'GET /api/v2/systems/{system}',
    cleanupEndpoint: 'DELETE /api/v2/systems/{system}',
    priority: 1,
    module: 'Systems',
  },

  // ===========================
  // Sourcefiles v2
  // ===========================
  {
    endpoint: 'POST /api/v2/sourcefiles/{sourceFilename}',
    description: 'Create a v2 source file',
    pathParams: { sourceFilename: '__test__sourcefile_v2' },
    requestBody: {
      sourceFilename: '__test__sourcefile_v2',
      description: 'Automated test sourcefile (v2)',
    },
    expectedStatus: 200,
    verifyEndpoint: 'GET /api/v2/sourcefiles/{sourceFilename}',
    cleanupEndpoint: 'DELETE /api/v2/sourcefiles/{sourceFilename}',
    priority: 2,
    module: 'Sourcefiles-v2',
  },

  // ===========================
  // Sourcefiles v3
  // ===========================
  {
    endpoint: 'POST /api/v3/sourcefiles/{sourceFilename}',
    description: 'Create a v3 source file',
    pathParams: { sourceFilename: '__test__sourcefile_v3' },
    requestBody: {
      sourceFilename: '__test__sourcefile_v3',
      description: 'Automated test sourcefile (v3)',
    },
    expectedStatus: 200,
    verifyEndpoint: 'GET /api/v3/sourcefiles/{sourceFilename}',
    cleanupEndpoint: 'DELETE /api/v3/sourcefiles/{sourceFilename}',
    priority: 2,
    module: 'Sourcefiles-v3',
  },

  // ===========================
  // Connections
  // ===========================
  {
    endpoint: 'POST /api/v2/connection/for/{system}',
    description: 'Create a connection for a test system',
    pathParams: { system: '__test__system' },
    requestBody: {
      system: '__test__system',
      connectionType: 'test',
      description: 'Automated test connection',
    },
    expectedStatus: 200,
    verifyEndpoint: 'GET /api/v2/connection/for/{system}',
    cleanupEndpoint: 'DELETE /api/v2/connection/for/{system}',
    dependsOn: ['POST /api/v2/systems/{system}'],
    priority: 3,
    module: 'Connections',
  },

  // ===========================
  // Settings
  // ===========================
  {
    endpoint: 'POST /api/v2/settings',
    description: 'Create or update a test setting',
    pathParams: {},
    requestBody: {
      key: '__test__setting',
      value: 'automated-test-value',
    },
    expectedStatus: 200,
    priority: 4,
    module: 'Settings',
  },

  // ===========================
  // Model
  // ===========================
  {
    endpoint: 'POST /api/v2/model/{mObject}',
    description: 'Create a test model object',
    pathParams: { mObject: '__test__model_object' },
    requestBody: {
      mObject: '__test__model_object',
      description: 'Automated test model object',
    },
    expectedStatus: 200,
    verifyEndpoint: 'GET /api/v2/model/{mObject}',
    cleanupEndpoint: 'DELETE /api/v2/model/{mObject}',
    priority: 5,
    module: 'Model',
  },
];
