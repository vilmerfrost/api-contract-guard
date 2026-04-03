import axios from 'axios';
import { createAxiosInstance } from '../lib/utils.js';

/**
 * Azure VM Configuration
 * Hardcoded for the PDQ development environment
 * 
 * ⚠️ IMPORTANT NOTES:
 * 1. subscriptionId must be the actual Azure subscription ID, not the tenant ID!
 *    Use the test-azure-auth.ts script to find the correct subscription ID.
 * 2. clientSecret must be the Secret VALUE (starts with "8Q~..."), not the Secret ID (UUID)
 *    The current value appears to be a Secret ID - this needs to be corrected.
 *    Get the correct value from Stefan or Azure Portal → App Registrations → Certificates & Secrets
 * 
 * All values can be overridden via environment variables:
 * - AZURE_TENANT_ID
 * - AZURE_CLIENT_ID
 * - AZURE_CLIENT_SECRET (⚠️ Must be Secret VALUE, not Secret ID)
 * - AZURE_SUBSCRIPTION_ID
 * - AZURE_RESOURCE_GROUP
 * - AZURE_VM_NAME
 */
const AZURE_CONFIG = {
  tenantId: '559961f7-70ad-4623-92b6-9ef9c6c467a9',
  clientId: '7924c011-cf3a-4911-ae89-f4158ecd7d43',
  // TODO: Replace with correct Client Secret VALUE from Stefan
  // Current value is the Secret ID (UUID), not the actual secret
  // Correct format should be: "8Q~xxxxxxxxxxxxx..." (40-128 chars)
  clientSecret: '2a02bd66-e9fe-4c5c-ac40-24be3167b3bf',
  subscriptionId: '559961f7-70ad-4623-92b6-9ef9c6c467a9', // ⚠️ FIXME: This is currently set to tenant ID - needs actual subscription ID
  resourceGroup: 'rg-pdq-dev-demo-001',
  vmName: 'vm-pdq-001',
};

// Use axios instance with SSL certificate handling
const axiosInstance = createAxiosInstance();

interface AzureTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Azure VM Auto-Starter
 * 
 * Automatically starts the Azure VM if the API is not accessible
 * and waits for it to become ready before proceeding with tests.
 */
export class AzureVMStarter {
  private managementToken: string | null = null;
  private config = {
    tenantId: process.env.AZURE_TENANT_ID || AZURE_CONFIG.tenantId,
    clientId: process.env.AZURE_CLIENT_ID || AZURE_CONFIG.clientId,
    clientSecret: process.env.AZURE_CLIENT_SECRET || AZURE_CONFIG.clientSecret,
    subscriptionId: process.env.AZURE_SUBSCRIPTION_ID || AZURE_CONFIG.subscriptionId,
    resourceGroup: process.env.AZURE_RESOURCE_GROUP || AZURE_CONFIG.resourceGroup,
    vmName: process.env.AZURE_VM_NAME || AZURE_CONFIG.vmName,
  };
  
  /**
   * Acquire Azure Management API access token
   */
  private async getManagementToken(): Promise<string> {
    if (this.managementToken) {
      return this.managementToken;
    }
    
    const url = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;
    
    try {
      const response = await axiosInstance.post<AzureTokenResponse>(
        url,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          scope: 'https://management.azure.com/.default'
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );
      
      this.managementToken = response.data.access_token;
      console.log('✅ Azure Management API token acquired');
      
      return this.managementToken;
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: Record<string, string> }; message?: string };
      const errorData = axiosError.response?.data;

      if (errorData?.error === 'invalid_client') {
        throw new Error(
          'Azure authentication failed: Invalid client credentials.\n' +
          '\n' +
          'Common causes:\n' +
          '1. Client Secret is wrong (you may have the Secret ID instead of Secret VALUE)\n' +
          '2. Client Secret has expired\n' +
          '3. Service Principal permissions are incorrect\n' +
          '\n' +
          'Solution:\n' +
          '- Verify AZURE_CLIENT_SECRET environment variable\n' +
          '- Check Azure Portal → App Registrations → Certificates & Secrets\n' +
          '- Ensure you copied the Secret VALUE (starts with "8Q~..."), not the Secret ID (UUID)\n' +
          '- If using hardcoded value, update src/cli/azure-starter.ts with correct Secret VALUE\n' +
          '\n' +
          `Azure error: ${errorData.error_description || errorData.error}`
        );
      }

      const errorMessage = errorData?.error_description
        || errorData?.error
        || axiosError.message;
      throw new Error(`Azure authentication failed: ${errorMessage}`);
    }
  }
  
  /**
   * Start the Azure VM
   */
  async startVM(): Promise<void> {
    const token = await this.getManagementToken();
    
    const url = (
      `https://management.azure.com/subscriptions/${this.config.subscriptionId}/` +
      `resourceGroups/${this.config.resourceGroup}/providers/Microsoft.Compute/` +
      `virtualMachines/${this.config.vmName}/start?api-version=2023-09-01`
    );
    
    console.log(`🔄 Starting VM: ${this.config.vmName}...`);
    
    try {
      const response = await axiosInstance.post(url, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 202 || response.status === 200) {
        console.log('✅ VM start command accepted');
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number }; message?: string };
      if (axiosError.response?.status === 409) {
        // VM is already running or starting
        console.log('ℹ️  VM is already running or starting');
        return;
      }
      throw new Error(`Failed to start VM: ${axiosError.message}`);
    }
  }
  
  /**
   * Wait for API to be ready by polling the health endpoint
   */
  async waitForAPIReady(
    apiUrl: string,
    maxWaitSeconds: number = 300
  ): Promise<boolean> {
    console.log(`⏳ Waiting for API to be ready (max ${maxWaitSeconds}s)...`);
    
    const startTime = Date.now();
    const interval = 10000; // Check every 10s
    
    while (Date.now() - startTime < maxWaitSeconds * 1000) {
      try {
        const response = await axiosInstance.get(apiUrl, { 
          timeout: 5000,
          validateStatus: (status) => status < 500 // Accept any non-server-error
        });
        
        if (response.status === 200) {
          console.log('✅ API is ready!');
          return true;
        }
      } catch (error) {
        // Still waiting...
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
      
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      console.log(`⏳ Still waiting... (${elapsed}s elapsed)`);
    }
    
    console.log('❌ Timeout waiting for API');
    return false;
  }
  
  /**
   * Check if API is accessible, start VM if not, and wait for ready
   */
  async ensureVMRunning(apiUrl: string): Promise<void> {
    console.log('🔍 Checking API accessibility...');
    
    // First, check if API is already accessible
    try {
      const response = await axiosInstance.get(apiUrl, { 
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      
      if (response.status === 200) {
        console.log('✅ VM is already running and API is accessible');
        return;
      }
    } catch (_error: unknown) {
      console.log('⚠️  API not accessible, attempting to start VM...');
    }
    
    // Start VM
    await this.startVM();
    
    // Wait for it to be ready
    const ready = await this.waitForAPIReady(apiUrl, 300);
    
    if (!ready) {
      throw new Error('VM did not become ready within timeout (300s)');
    }
  }
}

