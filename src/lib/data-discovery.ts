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
  attributes: Array<{ id: string; name?: string }>;      // Model object attributes
  auditZones: Array<{ id: string; name?: string }>;      // Audit zones
  auditKeys: Array<{ id: string; name?: string }>;       // Audit keys
  exportAliases: Array<{ id: string; name?: string }>;   // Export aliases (v2)
  ingestAliases: Array<{ id: string; name?: string }>;   // Ingest aliases (v3)
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
  
  // Model attribute parameters - maps to attributes cache
  'mAttr': 'attributes',
  'mattr': 'attributes',
  'attributeid': 'attributes',
  'attr': 'attributes',
  
  // Schedule parameters - schedules often use sourcefile as ID
  'schedule': 'schedules',
  'scheduleid': 'schedules',
  'predecessor': 'sourcefiles', // predecessor in schedule paths uses sourcefile
  
  // Connection parameters
  'connection': 'connections',
  'connectionid': 'connections',
  
  // Ingest/export alias parameters - PRIORITIZE discovered aliases over sourcefiles!
  'alias': 'ingestAliases',       // Try ingest aliases first
  'exportalias': 'exportAliases', // Export aliases
  
  // Audit zone/key parameters - maps to auditZones/auditKeys cache
  'zone': 'auditZones',
  'key': 'auditKeys',
  'auditkey': 'auditKeys',
  
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
    connections: [],
    attributes: [],
    auditZones: [],
    auditKeys: [],
    exportAliases: [],
    ingestAliases: []
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
        // Check for common wrapper patterns
        // IMPORTANT: Check for nested { data: { items: [...] } } first (like /api/v2/systems)
        if (data.data && typeof data.data === 'object' && data.data.items && Array.isArray(data.data.items)) {
          items = data.data.items;
        } else if (data.data && Array.isArray(data.data)) {
          items = data.data;
        } else if (data.items && Array.isArray(data.items)) {
          items = data.items;
        } else if (data.results && Array.isArray(data.results)) {
          items = data.results;
        } else {
          // For model objects, keys might be the resource names
          // But skip generic wrapper keys like 'data', 'items', 'results'
          const wrapperKeys = ['data', 'items', 'results', 'response', 'payload', '_links'];
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
  
  // Discover audit keys from audits endpoint
  // Response format: { data: { items: [...] } } with SrcFileKey field
  if (cache.sourcefiles.length > 0) {
    console.log('  🔍 Fetching audit keys...');
    const firstSourcefile = cache.sourcefiles[0];
    
    try {
      const auditsResponse = await axios.get(
        `${baseUrl}/api/v2/sourcefiles/${firstSourcefile.id}/audits`,
        config
      );

      if (auditsResponse.data) {
        const data = auditsResponse.data;
        let items: any[] = [];

        // Handle { data: { items: [...] } } structure
        if (data.data && data.data.items && Array.isArray(data.data.items)) {
          items = data.data.items;
        } else if (data.items && Array.isArray(data.items)) {
          items = data.items;
        } else if (Array.isArray(data)) {
          items = data;
        } else if (data.data && Array.isArray(data.data)) {
          items = data.data;
        }

        if (items.length > 0) {
          // Extract keys - the field is SrcFileKey (e.g., F-8fab8ca6-a2e1-4252-...)
          const keys = new Set<string>();
          
          items.forEach(audit => {
            const key = audit.SrcFileKey || audit.srcFileKey || audit.Key || audit.key || audit.auditKey || audit.id;
            if (key) keys.add(String(key));
          });
          
          if (keys.size > 0) {
            cache.auditKeys = Array.from(keys).slice(0, 10).map(k => ({ id: k, name: k }));
            console.log(`    ✅ Found ${cache.auditKeys.length} audit keys`);
            cache.auditKeys.slice(0, 3).forEach(item => {
              console.log(`       • Key: ${item.id}`);
            });
          } else {
            console.log(`    ⚠️  No audit keys found in response`);
          }
        } else {
          console.log(`    ⚠️  No audit items found`);
        }
      }
    } catch (error: any) {
      const status = error.response?.status || 'ERROR';
      console.log(`    ⚠️  Could not fetch audits [${status}]`);
    }
    
    // Add common audit zones (these are data lake zones)
    cache.auditZones = [
      { id: 'landing', name: 'Landing Zone' },
      { id: 'raw', name: 'Raw Zone' },
      { id: 'trusted', name: 'Trusted Zone' },
      { id: 'profile', name: 'Profile Zone' }
    ];
    console.log(`    ✅ Added ${cache.auditZones.length} common audit zones`);
  }
  
  // Discover systems
  // First try /api/v2/systems endpoint (response format: { data: { items: [...] } })
  let systemsFound = await safeFetch(`${baseUrl}/api/v2/systems`, 'systems', 'system', 'description');
  
  // If systems found, try to find one that has a working connection
  // Some systems return 400 on connection endpoints due to misconfiguration
  if (systemsFound && cache.systems.length > 0) {
    console.log('  🔍 Validating system connections...');
    
    // Sort systems to put known working ones first (Coincap is known to work)
    const knownGoodSystems = ['Coincap', 'Casehandler'];
    cache.systems.sort((a, b) => {
      const aIndex = knownGoodSystems.indexOf(a.id);
      const bIndex = knownGoodSystems.indexOf(b.id);
      if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
      if (aIndex >= 0) return -1;
      if (bIndex >= 0) return 1;
      return 0;
    });
    
    // Test each system to find one with a working connection
    let workingSystem: string | null = null;
    for (const system of cache.systems.slice(0, 5)) {
      try {
        const connectionResponse = await axios.get(
          `${baseUrl}/api/v2/connection/for/${system.id}`,
          config
        );
        if (connectionResponse.status === 200) {
          workingSystem = system.id;
          console.log(`    ✅ Found working system: ${system.id}`);
          break;
        }
      } catch (error: any) {
        // This system doesn't have a working connection, try next
      }
    }
    
    // Move the working system to the front
    if (workingSystem) {
      const workingIdx = cache.systems.findIndex(s => s.id === workingSystem);
      if (workingIdx > 0) {
        const [working] = cache.systems.splice(workingIdx, 1);
        cache.systems.unshift(working);
      }
    } else {
      console.log('    ⚠️  No system with working connection found');
    }
  }
  
  // If no systems found from /api/v2/systems, try fetching individual sourcefiles
  if (!systemsFound || cache.systems.length === 0) {
    if (cache.sourcefiles.length > 0) {
      console.log('  🔄 Discovering systems from individual sourcefiles...');
      const systemIds = new Set<string>();
      
      // Fetch details for up to 5 sourcefiles to find unique systems
      const sourcefilesToCheck = cache.sourcefiles.slice(0, 5);
      
      for (const sourcefile of sourcefilesToCheck) {
        try {
          const response = await axios.get(
            `${baseUrl}/api/v2/sourcefiles/${sourcefile.id}`,
            config
          );
          
          // Response format: { data: { sourceFilename: "...", system: "Casehandler", ... } }
          const systemName = response.data?.data?.system || 
                            response.data?.system ||
                            response.data?.data?.sourcesystem ||
                            response.data?.sourcesystem;
          
          if (systemName && typeof systemName === 'string') {
            systemIds.add(systemName);
            // Store system info on the sourcefile for reference
            (sourcefile as any).system = systemName;
          }
        } catch (error: any) {
          // Skip this sourcefile if we can't fetch it
        }
      }
      
      if (systemIds.size > 0) {
        cache.systems = Array.from(systemIds).map(id => ({ id, name: id }));
        console.log(`    ✅ Found ${cache.systems.length} systems from sourcefiles!`);
        cache.systems.slice(0, 3).forEach(item => {
          console.log(`       • System: ${item.id}`);
        });
      } else {
        console.log('    ⚠️  No systems found in sourcefile details');
      }
    } else {
      console.log('    ⚠️  No sourcefiles to extract systems from');
    }
  }
  
  // Discover model objects
  // DEBUG showed: data.data[0] keys: object, alias, description...
  // The ID field is 'object', not 'name'!
  await safeFetch(`${baseUrl}/api/v2/model`, 'modelObjects', 'object', 'alias');
  
  // Discover attributes for model objects (Hour 2 fix)
  if (cache.modelObjects.length > 0) {
    console.log('  🔍 Fetching attributes for model objects...');
    const firstModel = cache.modelObjects[0];
    
    try {
      const attributesResponse = await axios.get(
        `${baseUrl}/api/v2/model/${firstModel.id || firstModel.name}/attributes`,
        config
      );

      if (attributesResponse.data) {
        const data = attributesResponse.data;
        let items: any[] = [];

        if (Array.isArray(data)) {
          items = data;
        } else if (data.data && Array.isArray(data.data)) {
          items = data.data;
        } else if (data.items && Array.isArray(data.items)) {
          items = data.items;
        }

        if (items.length > 0) {
          cache.attributes = items.slice(0, 10).map(attr => {
            const id = attr.attribute || attr.attributeId || attr.id || attr.name || attr.Attribute;
            const name = attr.name || attr.attributeName || attr.Attribute || id;
            return { id: String(id), name: String(name) };
          }).filter(attr => attr.id);

          console.log(`    ✅ Found ${cache.attributes.length} attributes`);
          cache.attributes.slice(0, 3).forEach(item => {
            console.log(`       • ID: ${item.id} (${item.name})`);
          });
        } else {
          console.log(`    ⚠️  No attributes found`);
        }
      }
    } catch (error: any) {
      const status = error.response?.status || 'ERROR';
      console.log(`    ⚠️  Could not fetch attributes [${status}]`);
    }
  }
  
  // Discover schedules
  // DEBUG showed: First item keys: SourceFile, CurrentExecutionDttm...
  // The ID field is 'SourceFile' (capital S, capital F)
  await safeFetch(`${baseUrl}/api/v2/schedule`, 'schedules', 'SourceFile', 'SourceFile');
  
  // Discover connections
  await safeFetch(`${baseUrl}/api/v2/datastore/connection`, 'connections', 'id', 'name');
  
  // Discover export aliases (Hour 4 fix)
  if (cache.systems.length > 0) {
    console.log('  🔍 Fetching export aliases...');
    const firstSystem = cache.systems[0];
    
    try {
      const exportsResponse = await axios.get(
        `${baseUrl}/api/v2/exportlist/for/${firstSystem.id}`,
        config
      );

      if (exportsResponse.data) {
        const data = exportsResponse.data;
        let items: any[] = [];

        if (Array.isArray(data)) {
          items = data;
        } else if (data.data && Array.isArray(data.data)) {
          items = data.data;
        }

        if (items.length > 0) {
          cache.exportAliases = items.slice(0, 10).map(exp => {
            const id = exp.alias || exp.exportAlias || exp.Alias || exp.name || exp.ExportAlias;
            return { id: String(id), name: String(id) };
          }).filter(a => a.id && a.id !== 'undefined');

          if (cache.exportAliases.length > 0) {
            console.log(`    ✅ Found ${cache.exportAliases.length} export aliases`);
            cache.exportAliases.slice(0, 3).forEach(item => {
              console.log(`       • Alias: ${item.id}`);
            });
          } else {
            console.log(`    ⚠️  No export aliases found`);
          }
        } else {
          console.log(`    ⚠️  No export list found`);
        }
      }
    } catch (error: any) {
      const status = error.response?.status || 'ERROR';
      console.log(`    ⚠️  Could not fetch export aliases [${status}]`);
    }
  }

  // Discover ingest aliases (v3) (Hour 4 fix)
  if (cache.systems.length > 0) {
    console.log('  🔍 Fetching ingest aliases...');
    const firstSystem = cache.systems[0];
    
    try {
      const ingestsResponse = await axios.get(
        `${baseUrl}/api/v3/ingest/list/for/${firstSystem.id}`,
        config
      );

      if (ingestsResponse.data) {
        const data = ingestsResponse.data;
        let items: any[] = [];

        if (Array.isArray(data)) {
          items = data;
        } else if (data.data && Array.isArray(data.data)) {
          items = data.data;
        }

        if (items.length > 0) {
          cache.ingestAliases = items.slice(0, 10).map(ing => {
            const id = ing.alias || ing.ingestAlias || ing.Alias || ing.name || ing.IngestAlias;
            return { id: String(id), name: String(id) };
          }).filter(a => a.id && a.id !== 'undefined');

          if (cache.ingestAliases.length > 0) {
            console.log(`    ✅ Found ${cache.ingestAliases.length} ingest aliases`);
            cache.ingestAliases.slice(0, 3).forEach(item => {
              console.log(`       • Alias: ${item.id}`);
            });
          } else {
            console.log(`    ⚠️  No ingest aliases found`);
          }
        } else {
          console.log(`    ⚠️  No ingest list found`);
        }
      }
    } catch (error: any) {
      const status = error.response?.status || 'ERROR';
      console.log(`    ⚠️  Could not fetch ingest aliases [${status}]`);
    }
  }
  
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('DISCOVERY SUMMARY:');
  console.log(`  Sourcefiles: ${cache.sourcefiles.length}`);
  console.log(`  Systems: ${cache.systems.length}`);
  console.log(`  Model Objects: ${cache.modelObjects.length}`);
  console.log(`  Attributes: ${cache.attributes.length}`);
  console.log(`  Schedules: ${cache.schedules.length}`);
  console.log(`  Connections: ${cache.connections.length}`);
  console.log(`  Audit Zones: ${cache.auditZones.length}`);
  console.log(`  Audit Keys: ${cache.auditKeys.length}`);
  console.log(`  Export Aliases: ${cache.exportAliases.length}`);
  console.log(`  Ingest Aliases: ${cache.ingestAliases.length}`);
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
         cache.modelObjects.length > 0 ||
         cache.attributes.length > 0 ||
         cache.auditZones.length > 0 ||
         cache.exportAliases.length > 0 ||
         cache.ingestAliases.length > 0;
}

