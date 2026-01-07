import { AxiosRequestConfig } from 'axios';
import { TestStep, TestResult, EndpointGroup, AuthConfig } from '@/types';
import { deepCompare, stripMetaFields } from './comparator.js';
import { createAxiosInstance } from './utils.js';
import { substitutePathParameters } from './data-discovery.js';

const axios = createAxiosInstance();

/**
 * Get OAuth2 access token using password grant flow
 * Matches Stefan's production implementation exactly
 */
async function getOAuth2Token(
  tokenUrl: string,
  username: string,
  password: string
): Promise<string> {
  try {
    // Build form-encoded parameters (matching Stefan's implementation)
    const params = new URLSearchParams();
    const grantType = process.env.GRANT_TYPE || 'password';
    
    params.append('grant_type', grantType);
    
    if (grantType === 'password') {
      params.append('username', username);
      params.append('password', password);
    }

    // POST with form-encoded data (NOT JSON)
    const response = await axios.post(
      tokenUrl,
      params.toString(), // Convert to form-encoded string (matching Stefan's code)
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        // SSL-handled axios instance is already configured via createAxiosInstance()
      }
    );

    // Check if request was successful (matching Stefan's error handling)
    if (response.status !== 200) {
      const errorText = response.data ? JSON.stringify(response.data) : response.statusText;
      console.error(`Failed to fetch access token: ${response.status} ${response.statusText} - ${errorText}`);
      throw new Error(`Failed to fetch access token: ${response.status} ${response.statusText}`);
    }

    // Extract access token (matching Stefan's validation)
    const data = response.data;
    const accessToken = data?.access_token;

    if (!accessToken) {
      const errorMsg = data ? `No access_token in response. Response keys: ${Object.keys(data).join(', ')}` : 'Empty response';
      throw new Error(`Access token is null: ${errorMsg}`);
    }

    return accessToken;
  } catch (error: any) {
    // Enhanced error handling matching Stefan's implementation
    if (error.response) {
      const status = error.response.status;
      const statusText = error.response.statusText;
      const errorData = error.response.data;
      const errorText = errorData ? (typeof errorData === 'string' ? errorData : JSON.stringify(errorData)) : statusText;
      
      console.error(`OAuth2 authentication failed: ${status} ${statusText} - ${errorText}`);
      throw new Error(`OAuth2 authentication failed: ${status} ${statusText} - ${errorText.substring(0, 200)}`);
    }
    
    throw new Error(`OAuth2 authentication failed: ${error.message}`);
  }
}

export interface TestOptions {
  mode?: 'full' | 'readonly';
  testDataCache?: import('./data-discovery.js').TestDataCache;
}

export async function runEndpointTest(
  baseUrl: string,
  group: EndpointGroup,
  auth?: AuthConfig,
  onStepComplete?: (step: TestStep) => void,
  options?: TestOptions
): Promise<TestResult> {
  const mode = options?.mode || 'full';
  
  const steps: TestStep[] = [];
  const startTime = Date.now();
  
  const addStep = (step: TestStep) => {
    steps.push(step);
    onStepComplete?.(step);
  };
  
  // Helper to build full URL for logging
  const buildFullUrl = (path: string): string => {
    return `${baseUrl}${path}`;
  };
  
  // Helper to substitute path parameters with real IDs
  const substitutePath = (path: string): string => {
    if (options?.testDataCache) {
      // Use real IDs from cache
      return substitutePathParameters(path, options.testDataCache);
    } else {
      // Use placeholder "1"
      return path.replace(/\{[^}]+\}/g, '1');
    }
  };
  
  // Build auth headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  // Handle OAuth2 authentication
  if (auth?.type === 'oauth2' && auth.username && auth.password && auth.tokenUrl) {
    try {
      const token = await getOAuth2Token(auth.tokenUrl, auth.username, auth.password);
      headers['Authorization'] = `Bearer ${token}`;
      
      addStep({
        step: 'AUTH',
        method: 'POST',
        url: auth.tokenUrl,
        status: 200,
        timestamp: new Date(),
      });
    } catch (error: any) {
      const statusCode = error.response?.status || 0;
      const errorMsg = `OAuth2 authentication failed: ${error.message}`;
      
      addStep({
        step: 'AUTH',
        method: 'POST',
        url: auth.tokenUrl,
        status: statusCode,
        error: errorMsg,
        timestamp: new Date(),
      });
      
      // Log detailed error to console
      console.error(`  ❌ AUTH failed: ${auth.tokenUrl} [${statusCode}] - ${errorMsg}`);
      
      return {
        resource: group.resource,
        steps,
        passed: false,
        differences: [{ path: 'auth', expected: 'success', actual: 'failed', type: 'changed' }],
        duration: Date.now() - startTime,
      };
    }
  } else if (auth?.type === 'bearer' && auth.token) {
    headers['Authorization'] = `Bearer ${auth.token}`;
  } else if (auth?.type === 'apikey' && auth.token) {
    headers['X-API-Key'] = auth.token;
  }
  
  const config: AxiosRequestConfig = { headers, timeout: 30000 };
  
  // Find endpoints for each method
  const getEndpoint = group.endpoints.find(e => e.method === 'GET' && e.path.includes('{'));
  const getListEndpoint = group.endpoints.find(e => e.method === 'GET' && !e.path.includes('{'));
  const deleteEndpoint = group.endpoints.find(e => e.method === 'DELETE');
  const postEndpoint = group.endpoints.find(e => e.method === 'POST');
  
  try {
    // Step 1: GET (try specific ID first, then list)
    let getResponse: any;
    let resourceId = '1';
    let originalData: any = null;
    
    // If readonly mode, just test GET and return
    if (mode === 'readonly') {
      const testEndpoint = getEndpoint || getListEndpoint;
      
      if (!testEndpoint) {
        const errorMsg = 'No GET endpoint available';
        addStep({
          step: 'GET',
          method: 'GET',
          url: group.resource,
          error: errorMsg,
          timestamp: new Date(),
        });
        
        console.error(`  ❌ GET failed: ${group.resource} - ${errorMsg}`);
        
        return {
          resource: group.resource,
          steps,
          passed: false,
          differences: [{ path: 'error', expected: 'GET endpoint', actual: 'none', type: 'changed' }],
          duration: Date.now() - startTime,
        };
      }
      
      const testPath = substitutePath(testEndpoint.path);
      const fullUrl = buildFullUrl(testPath);
      
      try {
        const response = await axios.get(fullUrl, config);
        
        addStep({
          step: 'GET',
          method: 'GET',
          url: fullUrl,
          status: response.status,
          data: response.data,
          timestamp: new Date(),
        });
        
        const passed = response.status === 200;
        
        return {
          resource: group.resource,
          steps,
          passed,
          differences: passed ? [] : [{ path: 'status', expected: 200, actual: response.status, type: 'changed' }],
          duration: Date.now() - startTime,
        };
      } catch (error: any) {
        const statusCode = error.response?.status || 0;
        const errorMsg = error.message;
        
        addStep({
          step: 'GET',
          method: 'GET',
          url: fullUrl,
          status: statusCode,
          error: errorMsg,
          timestamp: new Date(),
        });
        
        // Log detailed error to console
        console.error(`  ❌ GET failed: ${fullUrl} [${statusCode}] - ${errorMsg}`);
        
        return {
          resource: group.resource,
          steps,
          passed: false,
          differences: [{ path: 'error', expected: 'success', actual: errorMsg, type: 'changed' }],
          duration: Date.now() - startTime,
        };
      }
    }
    
    // Full CRUD mode continues below...
    // Try GET with ID
    if (getEndpoint) {
      const getPath = substitutePath(getEndpoint.path);
      const fullUrl = buildFullUrl(getPath);
      
      try {
        getResponse = await axios.get(fullUrl, config);
        addStep({
          step: 'GET',
          method: 'GET',
          url: fullUrl,
          status: getResponse.status,
          data: getResponse.data,
          timestamp: new Date(),
        });
        originalData = getResponse.data;
      } catch (error: any) {
        const statusCode = error.response?.status || 0;
        
        if (statusCode === 404 && getListEndpoint) {
          // Try getting list
          const listUrl = buildFullUrl(getListEndpoint.path);
          const listResponse = await axios.get(listUrl, config);
          const items = Array.isArray(listResponse.data) ? listResponse.data : listResponse.data?.items || listResponse.data?.data || [];
          
          if (items.length > 0) {
            originalData = items[0];
            resourceId = originalData.id || originalData._id || '1';
            addStep({
              step: 'GET',
              method: 'GET',
              url: listUrl,
              status: 200,
              data: originalData,
              timestamp: new Date(),
            });
          } else {
            addStep({
              step: 'GET',
              method: 'GET',
              url: listUrl,
              status: 200,
              data: null,
              error: 'No resources found in collection',
              timestamp: new Date(),
            });
          }
        } else {
          const errorMsg = error.message;
          addStep({
            step: 'GET',
            method: 'GET',
            url: fullUrl,
            status: statusCode,
            error: errorMsg,
            timestamp: new Date(),
          });
          
          // Log detailed error to console
          console.error(`  ❌ GET failed: ${fullUrl} [${statusCode}] - ${errorMsg}`);
        }
      }
    } else if (getListEndpoint) {
      const listUrl = buildFullUrl(getListEndpoint.path);
      
      try {
        const listResponse = await axios.get(listUrl, config);
        const items = Array.isArray(listResponse.data) ? listResponse.data : listResponse.data?.items || listResponse.data?.data || [];
        
        if (items.length > 0) {
          originalData = items[0];
          resourceId = originalData.id || originalData._id || '1';
        }
        
        addStep({
          step: 'GET',
          method: 'GET',
          url: listUrl,
          status: listResponse.status,
          data: originalData || items,
          timestamp: new Date(),
        });
      } catch (error: any) {
        const statusCode = error.response?.status || 0;
        const errorMsg = error.message;
        
        addStep({
          step: 'GET',
          method: 'GET',
          url: listUrl,
          status: statusCode,
          error: errorMsg,
          timestamp: new Date(),
        });
        
        // Log detailed error to console
        console.error(`  ❌ GET failed: ${listUrl} [${statusCode}] - ${errorMsg}`);
      }
    }
    
    // Step 2: DELETE
    if (deleteEndpoint && resourceId) {
      const deletePath = substitutePath(deleteEndpoint.path);
      const fullUrl = buildFullUrl(deletePath);
      
      try {
        const deleteResponse = await axios.delete(fullUrl, config);
        addStep({
          step: 'DELETE',
          method: 'DELETE',
          url: fullUrl,
          status: deleteResponse.status,
          timestamp: new Date(),
        });
      } catch (error: any) {
        const statusCode = error.response?.status || 0;
        const errorMsg = statusCode === 404 ? 'Resource not found (may be expected)' : error.message;
        
        addStep({
          step: 'DELETE',
          method: 'DELETE',
          url: fullUrl,
          status: statusCode,
          error: errorMsg,
          timestamp: new Date(),
        });
        
        // Log detailed error to console (but only if not 404, which is expected)
        if (statusCode !== 404) {
          console.error(`  ❌ DELETE failed: ${fullUrl} [${statusCode}] - ${errorMsg}`);
        }
      }
    } else {
      addStep({
        step: 'DELETE',
        method: 'DELETE',
        url: group.resource,
        error: 'No DELETE endpoint available',
        timestamp: new Date(),
      });
    }
    
    // Step 3: POST
    let newResourceId: string | null = null;
    
    if (postEndpoint && originalData) {
      const postPayload = stripMetaFields(originalData);
      const fullUrl = buildFullUrl(postEndpoint.path);
      
      try {
        const postResponse = await axios.post(fullUrl, postPayload, config);
        newResourceId = postResponse.data?.id || postResponse.data?._id || null;
        
        addStep({
          step: 'POST',
          method: 'POST',
          url: fullUrl,
          status: postResponse.status,
          data: postResponse.data,
          timestamp: new Date(),
        });
      } catch (error: any) {
        const statusCode = error.response?.status || 0;
        const errorMsg = error.response?.data?.message || error.message;
        
        addStep({
          step: 'POST',
          method: 'POST',
          url: fullUrl,
          status: statusCode,
          data: postPayload,
          error: errorMsg,
          timestamp: new Date(),
        });
        
        // Log detailed error to console
        console.error(`  ❌ POST failed: ${fullUrl} [${statusCode}] - ${errorMsg}`);
      }
    } else {
      addStep({
        step: 'POST',
        method: 'POST',
        url: group.resource,
        error: postEndpoint ? 'No original data to recreate' : 'No POST endpoint available',
        timestamp: new Date(),
      });
    }
    
    // Step 4: VERIFY (GET the newly created resource)
    let verifyData: any = null;
    
    if (getEndpoint && newResourceId) {
      // For verification, use the newly created resource ID
      const verifyPath = getEndpoint.path.replace(/\{[^}]+\}/g, newResourceId);
      const fullUrl = buildFullUrl(verifyPath);
      
      try {
        const verifyResponse = await axios.get(fullUrl, config);
        verifyData = verifyResponse.data;
        
        addStep({
          step: 'VERIFY',
          method: 'GET',
          url: fullUrl,
          status: verifyResponse.status,
          data: verifyData,
          timestamp: new Date(),
        });
      } catch (error: any) {
        const statusCode = error.response?.status || 0;
        const errorMsg = error.message;
        
        addStep({
          step: 'VERIFY',
          method: 'GET',
          url: fullUrl,
          status: statusCode,
          error: errorMsg,
          timestamp: new Date(),
        });
        
        // Log detailed error to console
        console.error(`  ❌ VERIFY failed: ${fullUrl} [${statusCode}] - ${errorMsg}`);
      }
    } else {
      addStep({
        step: 'VERIFY',
        method: 'GET',
        url: group.resource,
        error: newResourceId ? 'No GET endpoint available' : 'No new resource ID to verify',
        timestamp: new Date(),
      });
    }
    
    // Step 5: COMPARE
    let differences: any[] = [];
    let passed = false;
    
    if (originalData && verifyData) {
      const cleanedOriginal = stripMetaFields(originalData);
      const cleanedVerify = stripMetaFields(verifyData);
      differences = deepCompare(cleanedOriginal, cleanedVerify);
      passed = differences.length === 0;
    }
    
    addStep({
      step: 'COMPARE',
      data: {
        original: originalData ? stripMetaFields(originalData) : null,
        verified: verifyData ? stripMetaFields(verifyData) : null,
        differences,
      },
      timestamp: new Date(),
    });
    
    const duration = Date.now() - startTime;
    
    return {
      resource: group.resource,
      steps,
      passed,
      differences,
      duration,
    };
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    steps.push({
      step: 'COMPARE',
      error: `Test failed: ${error.message}`,
      timestamp: new Date(),
    });
    
    return {
      resource: group.resource,
      steps,
      passed: false,
      differences: [{ path: 'error', expected: 'success', actual: error.message, type: 'changed' }],
      duration,
    };
  }
}
