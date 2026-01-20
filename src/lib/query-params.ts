/**
 * Default query parameters for endpoints that require them
 * 
 * Some API endpoints need specific query parameters to work correctly.
 * This file maps endpoint paths to their required query params.
 */

export const DEFAULT_QUERY_PARAMS: Record<string, Record<string, any>> = {
  // Hash/encrypt endpoints
  '/api/v2/get/new/hash': { 
    salt: 'test123' 
  },
  '/api/v2/encrypt/string': { 
    string: 'testdata' 
  },
  
  // Audit batch endpoint
  '/api/v2/auditbatch': { 
    batch: '1',
    limit: 100
  },
  
  // Schedule endpoints with required params
  '/api/v2/schedule/{sourcefile}/nextstep': { 
    step: 'current' 
  },
  '/api/v2/schedule/{sourcefile}/state': { 
    includeDetails: 'false'
  },
  
  // V3 schedule endpoints
  '/api/v3/schedule/by-time': { 
    time: new Date().toISOString(),
    limit: '10'
  },
  '/api/v3/schedule/active': {
    limit: '10'
  },
  
  // V3 audit publisher endpoints
  '/api/v3/audit/publisher/sourcefile': { 
    limit: '10',
    offset: '0'
  },
  '/api/v3/audit/publisher/table': { 
    limit: '10',
    offset: '0'
  },
  
  // OpenLineage endpoints
  '/api/v3/openlineage/dataset': { 
    namespace: 'default',
    name: 'test'
  },
  '/api/v3/openlineage/job': { 
    namespace: 'default',
    name: 'test'
  },
  
  // Ingest/Export endpoints with params
  '/api/v2/ingest/{alias}/latest': {
    limit: '10'
  },
  '/api/v2/export/{alias}': {
    limit: '10'
  },
  '/api/v3/ingest/{alias}/latest': {
    limit: '10'
  },
  
  // Search endpoints
  '/api/v2/search': {
    q: 'test',
    limit: '10'
  },
  '/api/v3/search': {
    q: 'test',
    limit: '10'
  },
  
  // Audit endpoints
  '/api/v2/sourcefiles/{sourcefile}/audits': {
    limit: '10'
  },
  // The zone endpoint requires a 'url' query parameter
  '/api/v2/sourcefiles/{sourcefile}/audit/by/{zone}': {
    url: 'test'  // Required parameter
  },
  '/api/v2/sourcefiles/{sourcefile}/audits/{key}': {
    // No query params needed - just the key in path
  },
  
  // History endpoints
  '/api/v2/sourcefiles/{sourcefile}/history': {
    limit: '10'
  },
  '/api/v3/sourcefiles/{sourcefile}/history': {
    limit: '10'
  },
  
  // Mapping endpoints
  '/api/v2/sourcefiles/{sourcefile}/mappings': {
    limit: '100'
  },
  
  // Lineage endpoints
  '/api/v2/lineage/upstream/{sourcefile}': {
    depth: '3'
  },
  '/api/v2/lineage/downstream/{sourcefile}': {
    depth: '3'
  },
  '/api/v3/lineage/upstream/{sourcefile}': {
    depth: '3'
  },
  '/api/v3/lineage/downstream/{sourcefile}': {
    depth: '3'
  },
};

/**
 * Get query parameters for an endpoint path
 * @param path - The endpoint path (may contain parameters like {sourcefile})
 * @returns Query parameters object or empty object if none required
 */
export function getQueryParams(path: string): Record<string, any> {
  // First try exact match
  if (DEFAULT_QUERY_PARAMS[path]) {
    return DEFAULT_QUERY_PARAMS[path];
  }
  
  // Then try pattern matching for paths with parameters
  for (const [pattern, params] of Object.entries(DEFAULT_QUERY_PARAMS)) {
    // Convert pattern to regex: /api/v2/schedule/{sourcefile}/state -> /api/v2/schedule/[^/]+/state
    const regexPattern = pattern.replace(/\{[^}]+\}/g, '[^/]+');
    const regex = new RegExp(`^${regexPattern}$`);
    
    if (regex.test(path)) {
      return params;
    }
  }
  
  return {};
}

/**
 * Check if an endpoint requires query parameters
 * @param path - The endpoint path
 * @returns true if query params are required
 */
export function requiresQueryParams(path: string): boolean {
  const params = getQueryParams(path);
  return Object.keys(params).length > 0;
}
