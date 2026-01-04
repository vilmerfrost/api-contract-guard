/**
 * Endpoint Blacklist Configuration
 * 
 * These endpoints are excluded from automated regression testing
 * due to side effects or operational concerns.
 */

export const EXCLUDED_ENDPOINTS = [
  'POST /api/v3/ingest/claim/workload',
  'POST /api/v3/ingest/start/workload',
  'POST /api/v3/ingest/completed/workload',
  'POST /api/v3/ingest/rerun/workload',
  'POST /api/v3.1/ingest/{sourcesystem}/{alias}/start/from/{startdate}',
  'GET /api/v2/copy/from/{fromsystem}/{fromsourcefile}/to/{tosystem}/{tosourcefile}',
  'POST /api/v2/master/schedule/{sourcefile}/rundate/{rundate}',
  'POST /api/v2/schedule/{sourcefile}/state',
  'POST /api/v3/schedule/bulk/state',
  'POST /api/v2/schedule/{sourcefile}/restart',
  'POST /api/v2/schedule/{sourcefile}/rerun',
  'POST /api/v2/schedule/{sourcefile}/start',
  'POST /api/v2/schedule/processor/{extname}/state',
  'POST /api/v2/restart/source/export',
  'GET /api/v2/deviations/badloadings',
  'GET /api/v2/deviations/danglingrecords/sample',
  'GET /api/v2/deviations/danglingrecords/fix',
  'GET /api/v2/deviations/danglingrecords/reload',
  'GET /api/v2/deviations/baddata/conversions',
  'GET /api/v2/deviations/baddata/conversions/sample',
  'GET /api/v2/run/qpi',
  'GET /api/v2/qpi/settings',
  'POST /api/v2/qpi/settings',
  'GET /api/v2/qpi',
  'POST /api/v2/qpi',
  'POST /api/v2/datalineage/source',
  'POST /api/v2/datalineage/model',
  'POST /api/v2/sourcefiles/{sourcefile}/audits/{key}/use',
  'POST /api/v2/sourcefiles/{sourcefile}/audit/sync/definition',
  'POST /api/v2/auditlog',
  'POST /api/v2/sourcefiles/{sourcefile}/audits',
  'POST /api/v2/auditbatch',
  'POST /api/v3/sourcefiles/{sourcefile}/audits',
  'POST /api/v3/blob/undefined/file',
  'POST /api/v3/{zone}/trigger',
  'POST /api/v3/sourcefiles/{sourcefile}/statistics',
  'POST /api/v3/audit/publisher/sourcefile',
  'POST /api/v3/audit/publisher/table',
  'POST /api/v3/audit/publisher/sourcefile/trigger',
];

/**
 * Check if an endpoint is excluded from testing
 * 
 * Supports exact matching and pattern matching for parameterized paths
 * Example: POST /api/v3/{zone}/trigger matches POST /api/v3/raw/trigger
 */
export function isEndpointExcluded(method: string, path: string): boolean {
  const normalized = `${method.toUpperCase()} ${path}`;
  
  return EXCLUDED_ENDPOINTS.some(excluded => {
    // Exact match
    if (excluded === normalized) return true;
    
    // Pattern match (handle path parameters like {id}, {zone}, etc.)
    const pattern = excluded.replace(/\{[^}]+\}/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(normalized);
  });
}

/**
 * Filter endpoint groups to exclude blacklisted endpoints
 */
export function filterBlacklistedEndpoints<T extends { method: string; path: string }>(
  endpoints: T[]
): T[] {
  return endpoints.filter(endpoint => !isEndpointExcluded(endpoint.method, endpoint.path));
}

