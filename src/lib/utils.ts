import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import axios from "axios";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Create an axios instance configured for SSL certificate handling
 * Respects NODE_TLS_REJECT_UNAUTHORIZED environment variable
 * Only applies SSL configuration in Node.js environment
 * 
 * Note: This function is safe to use in both browser and Node.js environments.
 * In the browser, it returns the default axios instance (browsers handle HTTPS automatically).
 */
export function createAxiosInstance() {
  // Only configure HTTPS agent in Node.js environment (not browser)
  if (typeof window === 'undefined' && typeof process !== 'undefined') {
    try {
      // Check if we're in Node.js and can access require
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      if (typeof require !== 'undefined' && typeof import.meta !== 'undefined' && import.meta.url) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createRequire } = require('module');
        const nodeRequire = createRequire(import.meta.url);
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const https = nodeRequire('https');
        
        // Check if SSL verification should be disabled
        // This can be set via: NODE_TLS_REJECT_UNAUTHORIZED=0 or ACCEPT_SELF_SIGNED_CERT=true
        const rejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0' 
          && process.env.ACCEPT_SELF_SIGNED_CERT !== 'true';

        const httpsAgent = new https.Agent({
          rejectUnauthorized: rejectUnauthorized,
        });

        return axios.create({
          httpsAgent,
        });
      }
    } catch {
      // Fallback if https module not available (browser or other environment)
      // This is expected in browser environments
    }
  }
  
  // Browser environment - return default axios instance
  // Browsers handle HTTPS certificates automatically via the browser's certificate store
  return axios;
}
