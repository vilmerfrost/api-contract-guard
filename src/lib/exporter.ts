import { EndpointGroup, TestResult } from '@/types';

export function generateYAMLConfig(
  swaggerUrl: string,
  baseUrl: string,
  auth: { type: string; token?: string },
  endpointGroups: EndpointGroup[]
): string {
  
  const yaml = `# API Regression Test Configuration
# Generated: ${new Date().toISOString()}

config:
  swagger_url: "${swaggerUrl}"
  base_url: "${baseUrl}"
  auth:
    type: "${auth?.type || 'none'}"
    ${auth?.token ? 'token: "***"  # Token redacted for security' : '# No token required'}

endpoints:
${endpointGroups.map(group => `  - resource: "${group.resource}"
    operations:
${group.endpoints.map(ep => `      - method: "${ep.method}"
        path: "${ep.path}"${ep.summary ? `
        summary: "${ep.summary.replace(/"/g, '\\"').substring(0, 100)}"` : ''}`).join('\n')}
    test_flow: "get_delete_post_verify"
`).join('\n')}

comparison:
  ignore_fields:
    - "id"
    - "_id"
    - "createdAt"
    - "updatedAt"
    - "created_at"
    - "updated_at"
    - "timestamp"
  strict_mode: false

ci_cd:
  platform: "circleci"  # or "bitbucket", "github-actions"
  docker_image: "regression-suite:latest"
  run_on:
    - push
    - pull_request
  fail_on_error: true
  timeout: 300  # seconds
`;

  return yaml;
}

export function generateTestResultsJSON(results: TestResult[]): string {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
    },
    results: results.map(r => ({
      resource: r.resource,
      passed: r.passed,
      duration: r.duration,
      steps: r.steps.map(s => ({
        step: s.step,
        method: s.method,
        url: s.url,
        status: s.status,
        error: s.error,
        timestamp: s.timestamp,
      })),
      differences: r.differences,
    })),
  };
  
  return JSON.stringify(report, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
