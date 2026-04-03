/**
 * Endpoint Blacklist Configuration
 * 
 * These endpoints are excluded from automated regression testing
 * due to side effects or operational concerns.
 * 
 * POST endpoints that are SAFE to test with fixtures (NOT blacklisted):
 * - System CRUD: POST /api/v2/systems/{system}
 * - Sourcefile CRUD: POST /api/v2/sourcefiles/{sourcefile}, v3, v3.1, v3.2
 * - Model CRUD: POST /api/v2/model/{mObject}, v3
 * - Mappings: POST /api/vX/sourcefiles/{sourcefile}/mappings (where X is 2, 3, 3.1, 3.2, 4)
 * - Settings: POST /api/v2/settings, POST /api/v3/settings
 * - Connections: POST /api/v2/connection/for/{sourcesystem}, v3
 */

export const EXCLUDED_ENDPOINTS = [
  // === WORKLOAD MANAGEMENT (side effects - modifies job state) ===
  'POST /api/v3/ingest/claim/workload',
  'POST /api/v3/ingest/start/workload',
  'POST /api/v3/ingest/completed/workload',
  'POST /api/v3/ingest/rerun/workload',
  'POST /api/v3.1/ingest/{sourcesystem}/{alias}/start/from/{startdate}',
  'POST /api/v2/claim/workload',
  'POST /api/v2/completed/workload',
  'POST /api/v2/rerun/workload',
  
  // === COPY/MIGRATION (side effects - modifies data) ===
  'GET /api/v2/copy/from/{fromsystem}/{fromsourcefile}/to/{tosystem}/{tosourcefile}',
  
  // === SCHEDULE STATE CHANGES (side effects - modifies scheduler) ===
  'POST /api/v2/master/schedule/{sourcefile}/rundate/{rundate}',
  'POST /api/v2/schedule/{sourcefile}/state',
  'POST /api/v3/schedule/bulk/state',
  'POST /api/v2/schedule/{sourcefile}/restart',
  'POST /api/v2/schedule/{sourcefile}/rerun',
  'POST /api/v2/schedule/{sourcefile}/start',
  'POST /api/v2/schedule/processor/{extname}/state',
  'POST /api/v2/restart/source/export',
  'POST /api/v2/master/schedule/{sourcefile}/next/rundate',
  'POST /api/v3/master/schedule/bulk/next/rundate',
  
  // NOTE: Deviations, QPI, Audit operations, and API bugs (500s) are NOT
  // blacklisted — the client wants to see these results, including failures.
  
  // === QUERY PARAM REQUIRED (cannot auto-discover params) ===
  'GET /api/v2/get/new/hash',           // Requires ?value= query param
  'GET /api/v2/encrypt/string',         // Requires ?value= query param
  'GET /api/v2/auditbatch',             // Requires ?batch= query param
  'GET /api/v2/schedule/{sourcefile}/nextstep',  // Requires complex state
  'GET /api/v2/schedule/{sourcefile}/state',     // Requires complex state
  'GET /api/v3/schedule/by-time',       // Requires ?from=&to= query params
  'GET /api/v3/audit/publisher/sourcefile',      // Requires ?sourcefile= query param
  'GET /api/v3/audit/publisher/table',           // Requires ?table= query param
  'GET /api/v3/openlineage/dataset',    // Requires ?namespace=&name= query params
  'GET /api/v2/extraprocessor',         // Requires ?sourcefile= query param
  
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

