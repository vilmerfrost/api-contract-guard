export interface CLITask {
  id: string;
  command: string;
  args: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  exitCode?: number;
  logs: CLILogEntry[];
  metadata: {
    swaggerUrl?: string;
    testMode?: string;
    parallel?: boolean;
    description?: string;
  };
}

export interface CLILogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn' | 'success' | 'debug';
  message: string;
  raw: string;
}

export interface CLITaskSummary {
  id: string;
  command: string;
  status: CLITask['status'];
  startTime: string;
  endTime?: string;
  duration: number;
  metadata: CLITask['metadata'];
  logCount: number;
}

export interface CLICommandConfig {
  name: string;
  description: string;
  options: CLICommandOption[];
}

export interface CLICommandOption {
  name: string;
  flag: string;
  description: string;
  type: 'string' | 'boolean' | 'number' | 'select';
  required?: boolean;
  default?: string | boolean | number;
  options?: string[]; // For select type
  placeholder?: string;
}

export const CLI_COMMANDS: CLICommandConfig[] = [
  {
    name: 'test',
    description: 'Run API regression tests against Swagger/OpenAPI spec',
    options: [
      {
        name: 'swaggerUrl',
        flag: '--swagger-url',
        description: 'Swagger/OpenAPI JSON URL',
        type: 'string',
        required: true,
        placeholder: 'https://api.example.com/swagger.json',
      },
      {
        name: 'tokenUrl',
        flag: '--token-url',
        description: 'OAuth2 token endpoint',
        type: 'string',
        required: true,
        placeholder: 'https://api.example.com/oauth/token',
      },
      {
        name: 'username',
        flag: '--username',
        description: 'OAuth2 username',
        type: 'string',
        required: true,
        placeholder: 'Enter username',
      },
      {
        name: 'password',
        flag: '--password',
        description: 'OAuth2 password',
        type: 'string',
        required: true,
        placeholder: 'Enter password',
      },
      {
        name: 'output',
        flag: '--output',
        description: 'JUnit XML output file path',
        type: 'string',
        default: 'junit.xml',
        placeholder: 'junit.xml',
      },
      {
        name: 'autoStartVm',
        flag: '--auto-start-vm',
        description: 'Automatically start Azure VM if API is down',
        type: 'boolean',
        default: true,
      },
      {
        name: 'parallel',
        flag: '--parallel',
        description: 'Run tests in parallel',
        type: 'boolean',
        default: false,
      },
      {
        name: 'maxParallel',
        flag: '--max-parallel',
        description: 'Maximum parallel tests',
        type: 'number',
        default: 5,
      },
      {
        name: 'mode',
        flag: '--mode',
        description: 'Test mode',
        type: 'select',
        default: 'full',
        options: ['full', 'readonly'],
      },
      {
        name: 'useRealData',
        flag: '--use-real-data',
        description: 'Discover and use real IDs from API',
        type: 'boolean',
        default: false,
      },
      {
        name: 'useHierarchical',
        flag: '--use-hierarchical',
        description: 'Test parent-child API relationships',
        type: 'boolean',
        default: false,
      },
      {
        name: 'testPosts',
        flag: '--test-posts',
        description: 'Run POST endpoint tests with predefined fixtures',
        type: 'boolean',
        default: false,
      },
      {
        name: 'skipCleanup',
        flag: '--skip-cleanup',
        description: 'Skip cleanup step in POST fixture tests',
        type: 'boolean',
        default: false,
      },
    ],
  },
  {
    name: 'test-posts',
    description: 'Run POST endpoint tests with predefined fixtures',
    options: [
      {
        name: 'swaggerUrl',
        flag: '--swagger-url',
        description: 'Swagger/OpenAPI JSON URL',
        type: 'string',
        required: true,
        placeholder: 'https://api.example.com/swagger.json',
      },
      {
        name: 'tokenUrl',
        flag: '--token-url',
        description: 'OAuth2 token endpoint',
        type: 'string',
        required: true,
        placeholder: 'https://api.example.com/oauth/token',
      },
      {
        name: 'username',
        flag: '--username',
        description: 'OAuth2 username',
        type: 'string',
        required: true,
        placeholder: 'Enter username',
      },
      {
        name: 'password',
        flag: '--password',
        description: 'OAuth2 password',
        type: 'string',
        required: true,
        placeholder: 'Enter password',
      },
      {
        name: 'output',
        flag: '--output',
        description: 'JUnit XML output file path',
        type: 'string',
        default: 'junit-posts.xml',
        placeholder: 'junit-posts.xml',
      },
      {
        name: 'autoStartVm',
        flag: '--auto-start-vm',
        description: 'Automatically start Azure VM if API is down',
        type: 'boolean',
        default: true,
      },
      {
        name: 'skipCleanup',
        flag: '--skip-cleanup',
        description: 'Skip cleanup step after tests',
        type: 'boolean',
        default: false,
      },
      {
        name: 'skipVerify',
        flag: '--skip-verify',
        description: 'Skip verification step after POST',
        type: 'boolean',
        default: false,
      },
      {
        name: 'module',
        flag: '--module',
        description: 'Only run tests for specific module',
        type: 'string',
        placeholder: 'SystemHandler, Model, etc.',
      },
    ],
  },
  {
    name: 'vm-start',
    description: 'Start the Azure VM and wait for API to be ready',
    options: [
      {
        name: 'apiUrl',
        flag: '--api-url',
        description: 'API URL to check for readiness',
        type: 'string',
        required: true,
        placeholder: 'https://api.example.com/health',
      },
      {
        name: 'maxWait',
        flag: '--max-wait',
        description: 'Maximum seconds to wait for API',
        type: 'number',
        default: 300,
      },
    ],
  },
  {
    name: 'list-endpoints',
    description: 'List all endpoints from Swagger (excluding blacklisted)',
    options: [
      {
        name: 'swaggerUrl',
        flag: '--swagger-url',
        description: 'Swagger/OpenAPI JSON URL',
        type: 'string',
        required: true,
        placeholder: 'https://api.example.com/swagger.json',
      },
      {
        name: 'includeBlacklisted',
        flag: '--include-blacklisted',
        description: 'Include blacklisted endpoints in output',
        type: 'boolean',
        default: false,
      },
      {
        name: 'showFullUrls',
        flag: '--show-full-urls',
        description: 'Show full URLs with base URL',
        type: 'boolean',
        default: false,
      },
    ],
  },
];
