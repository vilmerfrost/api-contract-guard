import axios from 'axios';
import { Endpoint, EndpointGroup } from '@/types';

// HTTPS agent for Azure VM's self-signed certificate
// This is required because pdq.swedencentral.cloudapp.azure.com
// uses a self-signed or internal CA certificate
// Can be overridden via NODE_TLS_REJECT_UNAUTHORIZED=0 or ACCEPT_SELF_SIGNED_CERT=true
// Note: This only applies in Node.js (CLI). Browsers handle HTTPS certificates automatically.
let httpsAgent: import('https').Agent | undefined;

function getHttpsAgent() {
  // Only configure HTTPS agent in Node.js environment (not browser)
  if (typeof window === 'undefined' && typeof process !== 'undefined') {
    if (!httpsAgent) {
      try {
        // Check if we're in Node.js and can access require
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        if (typeof require !== 'undefined') {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { createRequire } = require('module');
          const nodeRequire = createRequire(import.meta.url);
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const https = nodeRequire('https');
          const rejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0' 
            && process.env.ACCEPT_SELF_SIGNED_CERT !== 'true';
          httpsAgent = new https.Agent({
            rejectUnauthorized: rejectUnauthorized,
          });
        }
      } catch {
        // https module not available (browser environment) - this is expected
        // Browser will use default axios HTTPS handling
      }
    }
  }
  return httpsAgent;
}

export async function parseSwaggerUrl(url: string): Promise<{ groups: EndpointGroup[]; baseUrl: string }> {
  try {
    const agent = getHttpsAgent();
    const response = await axios.get(url, {
      httpsAgent: agent,
      timeout: 30000,
    });
    const spec = response.data;
    
    // Extract base URL
    let baseUrl = '';
    const parsedSwaggerUrl = new URL(url);
    
    // OpenAPI 3.0
    if (spec.servers && spec.servers.length > 0) {
      baseUrl = spec.servers[0].url;
      
      // If baseUrl is relative, make it absolute using the swagger URL
      if (baseUrl.startsWith('/')) {
        baseUrl = `${parsedSwaggerUrl.protocol}//${parsedSwaggerUrl.host}${baseUrl}`;
      } else if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        // Handle relative URLs without leading slash (relative to swagger URL path)
        const swaggerPath = parsedSwaggerUrl.pathname.substring(0, parsedSwaggerUrl.pathname.lastIndexOf('/'));
        baseUrl = `${parsedSwaggerUrl.protocol}//${parsedSwaggerUrl.host}${swaggerPath}/${baseUrl}`;
      }
    }
    // Swagger 2.0
    else if (spec.host) {
      const scheme = spec.schemes?.[0] || 'https';
      baseUrl = `${scheme}://${spec.host}${spec.basePath || ''}`;
    }
    // Fallback: derive from swagger URL
    else {
      baseUrl = `${parsedSwaggerUrl.protocol}//${parsedSwaggerUrl.host}`;
    }
    
    // Remove trailing slash
    baseUrl = baseUrl.replace(/\/$/, '');
    
    const paths = spec.paths || {};
    const endpoints: Endpoint[] = [];
    
    for (const [path, methods] of Object.entries(paths)) {
      for (const [method, details] of Object.entries(methods as any)) {
        const httpMethod = method.toUpperCase();
        if (['GET', 'POST', 'DELETE', 'PUT', 'PATCH'].includes(httpMethod)) {
          endpoints.push({
            path: path,
            method: httpMethod as Endpoint['method'],
            summary: (details as any).summary || (details as any).description,
            parameters: (details as any).parameters,
            requestBody: (details as any).requestBody,
            responses: (details as any).responses,
            operationId: (details as any).operationId,
          });
        }
      }
    }
    
    // Group by resource (first path segment after base)
    const grouped = new Map<string, Endpoint[]>();
    
    endpoints.forEach(endpoint => {
      // Extract resource: /api/users/{id} → /users, /pet/findByStatus → /pet
      const pathParts = endpoint.path.split('/').filter(Boolean);
      let resource = '/' + (pathParts[0] || 'root');
      
      // Handle paths like /api/v1/users
      if (pathParts[0]?.match(/^(api|v\d+)$/i) && pathParts.length > 1) {
        resource = '/' + pathParts.slice(0, 2).join('/');
      }
      
      if (!grouped.has(resource)) {
        grouped.set(resource, []);
      }
      grouped.get(resource)!.push(endpoint);
    });
    
    // Convert to array and sort
    const groups = Array.from(grouped.entries())
      .map(([resource, endpoints]) => ({
        resource,
        endpoints: endpoints.sort((a, b) => {
          const order: Record<string, number> = { GET: 1, POST: 2, PUT: 3, PATCH: 4, DELETE: 5 };
          return (order[a.method] || 99) - (order[b.method] || 99);
        }),
      }))
      .sort((a, b) => a.resource.localeCompare(b.resource));
    
    return { groups, baseUrl };
    
  } catch (error: any) {
    if (error.response) {
      throw new Error(`Failed to fetch Swagger: ${error.response.status} ${error.response.statusText}`);
    }
    if (error.code === 'ERR_NETWORK') {
      throw new Error('Network error: CORS may be blocking the request. Try using a proxy or ensure the API allows cross-origin requests.');
    }
    throw new Error(`Failed to parse Swagger: ${error.message}`);
  }
}

export function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'success';
    case 'POST':
      return 'info';
    case 'PUT':
    case 'PATCH':
      return 'warning';
    case 'DELETE':
      return 'destructive';
    default:
      return 'secondary';
  }
}
