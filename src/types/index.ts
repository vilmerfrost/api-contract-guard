export interface SwaggerConfig {
  url: string;
  auth?: {
    type: 'none' | 'bearer' | 'apikey';
    token?: string;
  };
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
  step: 'GET' | 'DELETE' | 'POST' | 'VERIFY' | 'COMPARE';
  method?: string;
  url?: string;
  status?: number;
  data?: any;
  error?: string;
  timestamp: Date;
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
  auth: {
    type: 'none' | 'bearer' | 'apikey';
    token?: string;
  };
  endpointGroups: EndpointGroup[];
  testResults: Map<string, TestResult>;
}
