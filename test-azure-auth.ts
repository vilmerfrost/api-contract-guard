#!/usr/bin/env node

/**
 * Azure Authentication Test Script
 * 
 * This script helps find the correct Azure subscription ID by:
 * 1. Acquiring an Azure Management API token
 * 2. Listing all accessible subscriptions
 * 
 * Usage:
 *   npx tsx test-azure-auth.ts
 * 
 * Or compile and run:
 *   npm run build:cli
 *   node dist/test-azure-auth.js
 */

import { createAxiosInstance } from './src/lib/utils.js';

const axios = createAxiosInstance();

const TENANT_ID = '559961f7-70ad-4623-92b6-9ef9c6c467a9';
const CLIENT_ID = '7924c011-cf3a-4911-ae89-f4158ecd7d43';
const CLIENT_SECRET = '2a02bd66-e9fe-4c5c-ac40-24be3167b3bf';

interface AzureTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Acquire Azure Management API access token
 */
async function getToken(): Promise<string> {
  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  
  console.log('🔐 Acquiring Azure token...');
  
  try {
    const response = await axios.post<AzureTokenResponse>(
      url,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'https://management.azure.com/.default'
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    
    console.log('✅ Token acquired successfully');
    return response.data.access_token;
  } catch (error: any) {
    const errorDetails = error.response?.data || error.message;
    console.error('❌ Failed to acquire token:');
    console.error('   Status:', error.response?.status);
    console.error('   Error:', JSON.stringify(errorDetails, null, 2));
    
    if (error.response?.status === 401) {
      console.error('\n💡 Possible issues:');
      console.error('   - Client ID or Client Secret is incorrect');
      console.error('   - Service principal does not have proper permissions');
      console.error('   - Tenant ID is incorrect');
      console.error('\n   Please verify credentials with Stefan or Azure admin.');
    }
    
    throw error;
  }
}

/**
 * List all accessible Azure subscriptions
 */
async function listSubscriptions(token: string): Promise<void> {
  const url = 'https://management.azure.com/subscriptions?api-version=2020-01-01';
  
  console.log('\n📋 Fetching subscriptions...');
  
  try {
    const response = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const subscriptions = response.data.value;
    
    if (subscriptions.length === 0) {
      console.log('⚠️  No subscriptions found. The service principal may not have access to any subscriptions.');
      return;
    }
    
    console.log(`\n✅ Found ${subscriptions.length} subscription(s):\n`);
    
    subscriptions.forEach((sub: any, index: number) => {
      console.log(`${index + 1}. ${sub.displayName || 'Unnamed'}`);
      console.log(`   Subscription ID: ${sub.subscriptionId}`);
      console.log(`   State: ${sub.state}`);
      console.log('');
    });
    
    // Try to find the one matching the resource group
    const targetResourceGroup = 'rg-pdq-dev-demo-001';
    console.log(`\n🔍 Looking for subscription containing resource group: ${targetResourceGroup}...`);
    
    for (const sub of subscriptions) {
      try {
        const rgUrl = `https://management.azure.com/subscriptions/${sub.subscriptionId}/resourceGroups/${targetResourceGroup}?api-version=2021-04-01`;
        const rgResponse = await axios.get(rgUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (rgResponse.status === 200) {
          console.log(`\n✅ Found matching subscription!`);
          console.log(`   Subscription ID: ${sub.subscriptionId}`);
          console.log(`   Display Name: ${sub.displayName || 'Unnamed'}`);
          console.log(`\n💡 Update src/cli/azure-starter.ts with this subscription ID:`);
          console.log(`   subscriptionId: '${sub.subscriptionId}',`);
          return;
        }
      } catch {
        // Resource group not in this subscription, continue
      }
    }
    
    console.log(`\n⚠️  Could not find resource group "${targetResourceGroup}" in any subscription.`);
    console.log(`   Please check the resource group name or verify permissions.`);
    
  } catch (error: any) {
    const errorDetails = error.response?.data || error.message;
    console.error('❌ Failed to list subscriptions:');
    console.error('   Status:', error.response?.status);
    console.error('   Error:', JSON.stringify(errorDetails, null, 2));
    
    if (error.response?.status === 403) {
      console.error('\n💡 The service principal may not have permissions to list subscriptions.');
      console.error('   Please ask Stefan or Azure admin to grant "Reader" role on subscriptions.');
    }
    
    throw error;
  }
}

/**
 * Main execution
 */
(async () => {
  try {
    console.log('🚀 Azure Authentication Test');
    console.log('═══════════════════════════════════════\n');
    
    const token = await getToken();
    await listSubscriptions(token);
    
    console.log('\n✅ Test completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Test failed');
    process.exit(1);
  }
})();

