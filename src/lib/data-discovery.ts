import { AuthConfig } from '@/types';
import { createAxiosInstance } from './utils.js';
import {
  HIERARCHICAL_API_DEFINITIONS,
  extractResourceId,
  ParentApiDefinition
} from './hierarchical-apis.js';

const axios = createAxiosInstance();

/**
 * Cache of real test data discovered from the API
 */
export interface TestDataCache {
  sourcefiles: Array<{ id: string; name?: string; system?: string }>;
  systems: Array<{ id: string; name?: string }>;
  modelObjects: Array<{ name: string; id?: string }>;
  schedules: Array<{ id: string; name?: string }>;
  connections: Array<{ id: string; name?: string }>;
  [key: string]: any[];
}

/**
 * Hierarchical test data for parent-child API relationships
 * Maps parent API paths to their discovered resources
 */
export interface HierarchicalTestData {
  /** Parent API path */
  parentPath: string;
  /** Description of the parent API */
  description: string;
  /** All discovered resources from the parent API */
  resources: Array<{ id: string; name?: string; [key: string]: any }>;
  /** Child API patterns that depend on this parent */
  childApiCount: number;
}

/**
 * Parameter mapping strategy
 * Maps path parameter names to cache keys
 * 
 * NOTE: The API uses these parameter names in paths:
 * - {sourcefile} -> uses sourceFilename from sourcefiles
 * - {sourcesystem} -> uses system from systems
 * - {system} -> uses system from systems
 * - {mObject} -> uses name from modelObjects
 */
const PARAMETER_MAPPING: Record<string, string> = {
  // Sourcefile parameters - maps to sourcefiles cache
  'sourcefile': 'sourcefiles',
  'sourcefileid': 'sourcefiles',
  'sourcefilename': 'sourcefiles',
  
  // System parameters - maps to systems cache
  // IMPORTANT: {sourcesystem} in paths uses the systems cache!
  'sourcesystem': 'systems',
  'system': 'systems',
  'systemid': 'systems',
  
  // Model object parameters
  'mObject': 'modelObjects',
  'mobject': 'modelObjects',
  'modelobject': 'modelObjects',
  'object': 'modelObjects',
  
  // Schedule parameters - schedules often use sourcefile as ID
  'schedule': 'schedules',
  'scheduleid': 'schedules',
  'predecessor': 'sourcefiles', // predecessor in schedule paths uses sourcefile
  
  // Connection parameters
  'connection': 'connections',
  'connectionid': 'connections',
  
  // Ingest/export parameters
  'alias': 'sourcefiles', // export/ingest alias often relates to sourcefile
  'exportalias': 'sourcefiles',
  
  // Zone parameters (for audit endpoints)
  'zone': 'sourcefiles', // zone in audit paths
  'key': 'sourcefiles', // audit key
  
  // Generic ID - try sourcefiles first
  'id': 'sourcefiles',
};

/**
 * Discover real test data from the API
 * Fetches actual resource IDs to use in tests instead of placeholder "1"
 */
export async function discoverTestData(
  baseUrl: string,
  auth?: AuthConfig
): Promise<TestDataCache> {
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('     DISCOVERING REAL TEST DATA');
  console.log('═══════════════════════════════════════');
  console.log('');
  
  const cache: TestDataCache = {
    sourcefiles: [],
    systems: [],
    modelObjects: [],
    schedules: [],
    connections: []
  };
  
  // Build auth headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  // Handle OAuth2 authentication - fetch token first!
  if (auth?.type === 'oauth2' && auth.username && auth.password && auth.tokenUrl) {
    try {
      console.log('  🔐 Fetching OAuth2 token for discovery...');
      const params = new URLSearchParams();
      const grantType = process.env.GRANT_TYPE || 'password';
      
      params.append('grant_type', grantType);
      
      if (grantType === 'password') {
        params.append('username', auth.username);
        params.append('password', auth.password);
      }

      const tokenResponse = await axios.post(
        auth.tokenUrl,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      if (tokenResponse.status !== 200) {
        throw new Error(`Failed to fetch access token: ${tokenResponse.status} ${tokenResponse.statusText}`);
      }

      const accessToken = tokenResponse.data?.access_token;
      if (!accessToken) {
        throw new Error('No access_token in response');
      }

      headers['Authorization'] = `Bearer ${accessToken}`;
      console.log('    ✅ OAuth2 token obtained');
    } catch (error: any) {
      const status = error.response?.status || 'ERROR';
      const errorMsg = error.response?.data?.message || error.message;
      console.error(`    ❌ OAuth2 authentication failed [${status}]: ${errorMsg}`);
      throw new Error(`OAuth2 authentication failed: ${errorMsg}`);
    }
  } else if (auth?.type === 'bearer' && auth.token) {
    headers['Authorization'] = `Bearer ${auth.token}`;
  } else if (auth?.type === 'apikey' && auth.token) {
    headers['X-API-Key'] = auth.token;
  }
  
  const config = { headers, timeout: 30000 };
  
  // Helper to safely fetch and extract data
  const safeFetch = async (url: string, cacheName: string, idField: string = 'id', nameField: string = 'name') => {
    try {
      console.log(`  🔍 Fetching ${cacheName}...`);
      const response = await axios.get(url, config);
      const data = response.data;
      
      // DEBUG: Log raw response structure
      if (process.env.DEBUG_DISCOVERY === 'true') {
        console.log(`    📋 DEBUG: Raw response type: ${typeof data}`);
        if (Array.isArray(data)) {
          console.log(`    📋 DEBUG: Array with ${data.length} items`);
          if (data.length > 0) {
            console.log(`    📋 DEBUG: First item keys: ${Object.keys(data[0]).join(', ')}`);
            console.log(`    📋 DEBUG: First item: ${JSON.stringify(data[0]).substring(0, 200)}`);
          }
        } else if (typeof data === 'object' && data !== null) {
          console.log(`    📋 DEBUG: Object keys: ${Object.keys(data).join(', ')}`);
          if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            console.log(`    📋 DEBUG: data.data[0] keys: ${Object.keys(data.data[0]).join(', ')}`);
            console.log(`    📋 DEBUG: data.data[0]: ${JSON.stringify(data.data[0]).substring(0, 200)}`);
          }
        }
      }
      
      // Handle different response formats
      let items: any[] = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (typeof data === 'object' && data !== null) {
        // Check for common wrapper patterns (PRIORITIZE data wrapper)
        if (data.data && Array.isArray(data.data)) {
          items = data.data;
        } else if (data.items && Array.isArray(data.items)) {
          items = data.items;
        } else if (data.results && Array.isArray(data.results)) {
          items = data.results;
        } else {
          // For model objects, keys might be the resource names
          // But skip generic wrapper keys like 'data', 'items', 'results'
          const wrapperKeys = ['data', 'items', 'results', 'response', 'payload'];
          items = Object.keys(data)
            .filter(key => !wrapperKeys.includes(key.toLowerCase()))
            .map(key => ({ name: key, id: key }));
        }
      }
      
      if (items.length > 0) {
        const extracted = items.slice(0, 10).map(item => {
          const result: any = {};
          
          // Extract ID - try the specified field first, then common alternatives
          // Note: Field names are case-sensitive (e.g., 'SourceFile' vs 'sourcefile')
          if (item[idField]) {
            result.id = String(item[idField]);
          } else if (item._id) {
            result.id = String(item._id);
          } else if (item.SourceFile) {
            result.id = String(item.SourceFile);
          } else if (item.sourceFilename) {
            result.id = String(item.sourceFilename);
          } else if (item.sourcefile) {
            result.id = String(item.sourcefile);
          } else if (item.object) {
            result.id = String(item.object);
          } else if (item.sourcesystem) {
            result.id = String(item.sourcesystem);
          } else if (item.system) {
            result.id = String(item.system);
          } else if (item.name) {
            result.id = String(item.name);
          } else if (item.id) {
            result.id = String(item.id);
          }
          
          // Extract name - for display purposes
          if (item[nameField]) {
            result.name = String(item[nameField]);
          } else if (item.alias) {
            result.name = String(item.alias);
          } else if (item.displayName) {
            result.name = String(item.displayName);
          } else if (item.description) {
            result.name = String(item.description);
          }
          
          // Extract system for sourcefiles
          if (item.system || item.sourcesystem) {
            result.system = String(item.system || item.sourcesystem);
          }
          
          return result;
        }).filter(item => item.id || item.name);
        
        cache[cacheName] = extracted;
        console.log(`    ✅ Found ${extracted.length} ${cacheName}`);
        
        // Log first 3 examples
        extracted.slice(0, 3).forEach(item => {
          const display = item.id ? `ID: ${item.id}` : `Name: ${item.name}`;
          console.log(`       • ${display}${item.name && item.id ? ` (${item.name})` : ''}`);
        });
        
        return true;
      } else {
        console.log(`    ⚠️  No ${cacheName} found (empty list)`);
        return false;
      }
    } catch (error: any) {
      const status = error.response?.status || 'ERROR';
      console.log(`    ⚠️  Could not fetch ${cacheName} [${status}]`);
      return false;
    }
  };
  
  // Discover sourcefiles (v3 first, then v2)
  // API returns 'sourceFilename' as the ID field for sourcefiles
  let sourcefilesFound = await safeFetch(`${baseUrl}/api/v3/sourcefiles`, 'sourcefiles', 'sourceFilename', 'name');
  if (!sourcefilesFound) {
    sourcefilesFound = await safeFetch(`${baseUrl}/api/v2/sourcefiles`, 'sourcefiles', 'sourceFilename', 'name');
  }
  
  // If no sourcefiles, try to get them from schedules (schedules contain SourceFile field)
  if (!sourcefilesFound) {
    console.log('  🔄 Trying to discover sourcefiles from schedules...');
    const scheduleData = await safeFetch(`${baseUrl}/api/v2/schedule`, 'sourcefiles', 'SourceFile', 'SourceFile');
    if (scheduleData) {
      console.log('    ✅ Got sourcefiles from schedules!');
    }
  }
  
  // Discover systems
  // API returns 'system' or 'sourcesystem' as the ID field
  await safeFetch(`${baseUrl}/api/v2/systems`, 'systems', 'system', 'name');
  
  // Discover model objects
  // DEBUG showed: data.data[0] keys: object, alias, description...
  // The ID field is 'object', not 'name'!
  await safeFetch(`${baseUrl}/api/v2/model`, 'modelObjects', 'object', 'alias');
  
  // Discover schedules
  // DEBUG showed: First item keys: SourceFile, CurrentExecutionDttm...
  // The ID field is 'SourceFile' (capital S, capital F)
  await safeFetch(`${baseUrl}/api/v2/schedule`, 'schedules', 'SourceFile', 'SourceFile');
  
  // Discover connections
  await safeFetch(`${baseUrl}/api/v2/datastore/connection`, 'connections', 'id', 'name');
  
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('DISCOVERY SUMMARY:');
  console.log(`  Sourcefiles: ${cache.sourcefiles.length}`);
  console.log(`  Systems: ${cache.systems.length}`);
  console.log(`  Model Objects: ${cache.modelObjects.length}`);
  console.log(`  Schedules: ${cache.schedules.length}`);
  console.log(`  Connections: ${cache.connections.length}`);
  console.log('═══════════════════════════════════════');
  console.log('');
  
  return cache;
}

/**
 * Discover hierarchical test data for parent-child API relationships
 * Fetches all resources from parent APIs to use for testing child APIs
 */
export async function discoverHierarchicalTestData(
  baseUrl: string,
  auth?: AuthConfig
): Promise<HierarchicalTestData[]> {
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  DISCOVERING HIERARCHICAL TEST DATA');
  console.log('═══════════════════════════════════════');
  console.log('');
  
  const hierarchicalData: HierarchicalTestData[] = [];
  
  // Build auth headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  // Handle OAuth2 authentication
  if (auth?.type === 'oauth2' && auth.username && auth.password && auth.tokenUrl) {
    try {
      console.log('  🔐 Fetching OAuth2 token for hierarchical discovery...');
      const params = new URLSearchParams();
      const grantType = process.env.GRANT_TYPE || 'password';
      
      params.append('grant_type', grantType);
      
      if (grantType === 'password') {
        params.append('username', auth.username);
        params.append('password', auth.password);
      }

      const tokenResponse = await axios.post(
        auth.tokenUrl,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      if (tokenResponse.status !== 200) {
        throw new Error(`Failed to fetch access token: ${tokenResponse.status} ${tokenResponse.statusText}`);
      }

      const accessToken = tokenResponse.data?.access_token;
      if (!accessToken) {
        throw new Error('No access_token in response');
      }

      headers['Authorization'] = `Bearer ${accessToken}`;
      console.log('    ✅ OAuth2 token obtained');
    } catch (error: any) {
      const status = error.response?.status || 'ERROR';
      const errorMsg = error.response?.data?.message || error.message;
      console.error(`    ❌ OAuth2 authentication failed [${status}]: ${errorMsg}`);
      throw new Error(`OAuth2 authentication failed: ${errorMsg}`);
    }
  } else if (auth?.type === 'bearer' && auth.token) {
    headers['Authorization'] = `Bearer ${auth.token}`;
  } else if (auth?.type === 'apikey' && auth.token) {
    headers['X-API-Key'] = auth.token;
  }
  
  const config = { headers, timeout: 30000 };
  
  // Fetch data from each parent API
  for (const definition of HIERARCHICAL_API_DEFINITIONS) {
    try {
      const parentUrl = `${baseUrl}${definition.parentPath}`;
      console.log(`  🔍 Fetching parent API: ${definition.parentPath}`);
      console.log(`     ${definition.description}`);
      
      const response = await axios.get(parentUrl, config);
      const data = response.data;
      
      // Handle different response formats
      let items: any[] = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (typeof data === 'object' && data !== null) {
        // Check for common wrapper patterns (PRIORITIZE data wrapper)
        if (data.data && Array.isArray(data.data)) {
          items = data.data;
        } else if (data.items && Array.isArray(data.items)) {
          items = data.items;
        } else if (data.results && Array.isArray(data.results)) {
          items = data.results;
        } else {
          // For non-array responses, wrap in array
          items = [data];
        }
      }
      
      // Extract resource IDs from all items
      const resources: Array<{ id: string; name?: string; [key: string]: any }> = [];
      for (const item of items) {
        const id = extractResourceId(item, definition.idField, definition.alternativeIdFields);
        if (id) {
          resources.push({
            id,
            name: item.name || item.displayName || item.title || undefined,
            ...item // Include all fields for potential future use
          });
        }
      }
      
      if (resources.length > 0) {
        hierarchicalData.push({
          parentPath: definition.parentPath,
          description: definition.description,
          resources,
          childApiCount: definition.childApis.length
        });
        
        console.log(`    ✅ Found ${resources.length} resources`);
        console.log(`    📋 Will test ${definition.childApis.length} child APIs per resource`);
        console.log(`    🎯 Total child tests: ${resources.length * definition.childApis.length}`);
        
        // Log first 3 examples
        resources.slice(0, 3).forEach(resource => {
          const display = resource.name ? `${resource.id} (${resource.name})` : resource.id;
          console.log(`       • ${display}`);
        });
      } else {
        console.log(`    ⚠️  No resources found`);
      }
    } catch (error: any) {
      const status = error.response?.status || 'ERROR';
      console.log(`    ⚠️  Could not fetch parent API [${status}]: ${definition.parentPath}`);
    }
    
    console.log('');
  }
  
  console.log('═══════════════════════════════════════');
  console.log('HIERARCHICAL DISCOVERY SUMMARY:');
  
  let totalResources = 0;
  let totalChildTests = 0;
  
  for (const data of hierarchicalData) {
    totalResources += data.resources.length;
    totalChildTests += data.resources.length * data.childApiCount;
    console.log(`  ${data.description}:`);
    console.log(`    Resources: ${data.resources.length}`);
    console.log(`    Child APIs: ${data.childApiCount}`);
    console.log(`    Total Tests: ${data.resources.length * data.childApiCount}`);
  }
  
  console.log('');
  console.log(`  TOTAL PARENT RESOURCES: ${totalResources}`);
  console.log(`  TOTAL CHILD API TESTS: ${totalChildTests}`);
  console.log('═══════════════════════════════════════');
  console.log('');
  
  return hierarchicalData;
}

/**
 * Substitute real IDs into a path template
 * 
 * Example:
 *   substitutePathParameters('/api/v2/sourcefiles/{sourcefile}/mappings', cache)
 *   => '/api/v2/sourcefiles/ABC123/mappings'
 */
export function substitutePathParameters(path: string, cache: TestDataCache): string {
  // Find all path parameters like {sourcefile}, {system}, etc.
  return path.replace(/\{([^}]+)\}/g, (match, paramName) => {
    const paramNameLower = paramName.toLowerCase();
    
    // Find the cache key for this parameter
    const cacheKey = PARAMETER_MAPPING[paramNameLower];
    
    if (!cacheKey || !cache[cacheKey] || cache[cacheKey].length === 0) {
      // Fallback to "1" if no real data available
      return '1';
    }
    
    // Use the first available ID or name
    const items = cache[cacheKey];
    const firstItem = items[0];
    
    return firstItem.id || firstItem.name || '1';
  });
}

/**
 * Get a specific parameter value from cache
 */
export function getParameterValue(paramName: string, cache: TestDataCache): string {
  const paramNameLower = paramName.toLowerCase();
  const cacheKey = PARAMETER_MAPPING[paramNameLower];
  
  if (!cacheKey || !cache[cacheKey] || cache[cacheKey].length === 0) {
    return '1';
  }
  
  const items = cache[cacheKey];
  const firstItem = items[0];
  
  return firstItem.id || firstItem.name || '1';
}

/**
 * Check if data discovery was successful
 */
export function hasDiscoveredData(cache: TestDataCache): boolean {
  return cache.sourcefiles.length > 0 || 
         cache.systems.length > 0 || 
         cache.modelObjects.length > 0;
}

