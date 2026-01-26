export interface SwaggerConfig {
  url: string;
  auth?: AuthConfig;
}

export interface AuthConfig {
  type: 'none' | 'bearer' | 'apikey' | 'oauth2';
  token?: string;
  username?: string;
  password?: string;
  tokenUrl?: string;
}

export interface Endpoint {
  path: string;
  method: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';
  summary?: string;
  parameters?: any[];
  requestBody?: any;
  responses?: any;
  operationId?: string;
}

export interface EndpointGroup {
  resource: string;
  endpoints: Endpoint[];
}

export interface TestStep {
  step: 'AUTH' | 'GET' | 'DELETE' | 'POST' | 'VERIFY' | 'COMPARE' | 'VALIDATE' | 'CLEANUP';
  method?: string;
  url?: string;
  status?: number;
  data?: any;
  error?: string;
  timestamp: Date;
}

/**
 * POST endpoint test case configuration
 * Defines predefined test data for POST endpoint testing
 */
export interface PostTestCase {
  /** Endpoint pattern, e.g., "POST /api/v2/systems/{system}" */
  endpoint: string;
  /** Human-readable description */
  description: string;
  /** Path parameter values, e.g., { system: "TestSystem" } */
  pathParams: Record<string, string>;
  /** Request body to send */
  requestBody: any;
  /** Expected HTTP status code */
  expectedStatus: number;
  /** Optional function to validate response */
  validateResponse?: (response: any) => boolean;
  /** GET endpoint to verify creation (with path params substituted) */
  verifyEndpoint?: string;
  /** DELETE endpoint for cleanup (with path params substituted) */
  cleanupEndpoint?: string;
  /** Body for DELETE request if needed */
  cleanupBody?: any;
  /** Dependencies - other test cases that must run first */
  dependsOn?: string[];
  /** Priority for ordering (lower = earlier) */
  priority?: number;
  /** Module/category for grouping */
  module: string;
}

export interface TestResult {
  resource: string;
  steps: TestStep[];
  passed: boolean;
  differences?: Difference[];
  duration: number;
}

export interface Difference {
  path: string;
  expected: any;
  actual: any;
  type: 'added' | 'removed' | 'changed';
}

export interface AppState {
  swaggerUrl: string;
  baseUrl: string;
  auth: AuthConfig;
  endpointGroups: EndpointGroup[];
  testResults: Map<string, TestResult>;
}
