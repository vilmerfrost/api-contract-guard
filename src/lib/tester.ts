import axios, { AxiosRequestConfig } from 'axios';
import { TestStep, TestResult, EndpointGroup, AuthConfig } from '@/types';
import { deepCompare, stripMetaFields } from './comparator';

async function getOAuth2Token(
  tokenUrl: string,
  username: string,
  password: string
): Promise<string> {
  const response = await axios.post(tokenUrl, 
    new URLSearchParams({
      grant_type: 'password',
      username,
      password,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  
  return response.data.access_token;
}

export async function runEndpointTest(
  baseUrl: string,
  group: EndpointGroup,
  auth?: AuthConfig,
  onStepComplete?: (step: TestStep) => void
): Promise<TestResult> {
  
  const steps: TestStep[] = [];
  const startTime = Date.now();
  
  const addStep = (step: TestStep) => {
    steps.push(step);
    onStepComplete?.(step);
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
      addStep({
        step: 'AUTH',
        method: 'POST',
        url: auth.tokenUrl,
        status: error.response?.status || 0,
        error: `OAuth2 authentication failed: ${error.message}`,
        timestamp: new Date(),
      });
      
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
    
    // Try GET with ID
    if (getEndpoint) {
      const getPath = getEndpoint.path.replace(/\{[^}]+\}/g, resourceId);
      
      try {
        getResponse = await axios.get(`${baseUrl}${getPath}`, config);
        addStep({
          step: 'GET',
          method: 'GET',
          url: getPath,
          status: getResponse.status,
          data: getResponse.data,
          timestamp: new Date(),
        });
        originalData = getResponse.data;
      } catch (error: any) {
        if (error.response?.status === 404 && getListEndpoint) {
          // Try getting list
          const listResponse = await axios.get(`${baseUrl}${getListEndpoint.path}`, config);
          const items = Array.isArray(listResponse.data) ? listResponse.data : listResponse.data?.items || listResponse.data?.data || [];
          
          if (items.length > 0) {
            originalData = items[0];
            resourceId = originalData.id || originalData._id || '1';
            addStep({
              step: 'GET',
              method: 'GET',
              url: getListEndpoint.path,
              status: 200,
              data: originalData,
              timestamp: new Date(),
            });
          } else {
            addStep({
              step: 'GET',
              method: 'GET',
              url: getListEndpoint.path,
              status: 200,
              data: null,
              error: 'No resources found in collection',
              timestamp: new Date(),
            });
          }
        } else {
          addStep({
            step: 'GET',
            method: 'GET',
            url: getPath,
            status: error.response?.status || 0,
            error: error.message,
            timestamp: new Date(),
          });
        }
      }
    } else if (getListEndpoint) {
      try {
        const listResponse = await axios.get(`${baseUrl}${getListEndpoint.path}`, config);
        const items = Array.isArray(listResponse.data) ? listResponse.data : listResponse.data?.items || listResponse.data?.data || [];
        
        if (items.length > 0) {
          originalData = items[0];
          resourceId = originalData.id || originalData._id || '1';
        }
        
        addStep({
          step: 'GET',
          method: 'GET',
          url: getListEndpoint.path,
          status: listResponse.status,
          data: originalData || items,
          timestamp: new Date(),
        });
      } catch (error: any) {
        addStep({
          step: 'GET',
          method: 'GET',
          url: getListEndpoint.path,
          status: error.response?.status || 0,
          error: error.message,
          timestamp: new Date(),
        });
      }
    }
    
    // Step 2: DELETE
    if (deleteEndpoint && resourceId) {
      const deletePath = deleteEndpoint.path.replace(/\{[^}]+\}/g, resourceId);
      
      try {
        const deleteResponse = await axios.delete(`${baseUrl}${deletePath}`, config);
        addStep({
          step: 'DELETE',
          method: 'DELETE',
          url: deletePath,
          status: deleteResponse.status,
          timestamp: new Date(),
        });
      } catch (error: any) {
        addStep({
          step: 'DELETE',
          method: 'DELETE',
          url: deletePath,
          status: error.response?.status || 0,
          error: error.response?.status === 404 ? 'Resource not found (may be expected)' : error.message,
          timestamp: new Date(),
        });
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
      
      try {
        const postResponse = await axios.post(`${baseUrl}${postEndpoint.path}`, postPayload, config);
        newResourceId = postResponse.data?.id || postResponse.data?._id || null;
        
        addStep({
          step: 'POST',
          method: 'POST',
          url: postEndpoint.path,
          status: postResponse.status,
          data: postResponse.data,
          timestamp: new Date(),
        });
      } catch (error: any) {
        addStep({
          step: 'POST',
          method: 'POST',
          url: postEndpoint.path,
          status: error.response?.status || 0,
          data: postPayload,
          error: error.response?.data?.message || error.message,
          timestamp: new Date(),
        });
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
      const verifyPath = getEndpoint.path.replace(/\{[^}]+\}/g, newResourceId);
      
      try {
        const verifyResponse = await axios.get(`${baseUrl}${verifyPath}`, config);
        verifyData = verifyResponse.data;
        
        addStep({
          step: 'VERIFY',
          method: 'GET',
          url: verifyPath,
          status: verifyResponse.status,
          data: verifyData,
          timestamp: new Date(),
        });
      } catch (error: any) {
        addStep({
          step: 'VERIFY',
          method: 'GET',
          url: verifyPath,
          status: error.response?.status || 0,
          error: error.message,
          timestamp: new Date(),
        });
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
