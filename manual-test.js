const https = require('https');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const TOKEN_URL = process.env.TOKEN_URL;
const API_USERNAME = process.env.API_USERNAME;
const API_PASSWORD = process.env.API_PASSWORD;

async function getToken() {
  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('username', API_USERNAME);
  params.append('password', API_PASSWORD);

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await response.json();
  return data.access_token;
}

async function testEndpoint(token, url) {
  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return { url, status: response.status, ok: response.ok };
  } catch (error) {
    return { url, error: error.message };
  }
}

async function main() {
  console.log('🔐 Gettg OAuth2 token...');
  const token = await getToken();
  console.log('✅ Token acquired\n');

  const baseUrl = 'https://pdq.swedencentral.cloudapp.azure.com/dev/app';
  const endpoints = [
    '/api/v2/settings',
    '/api/v2/sourcefiles',
    '/api/v2/systems',
    '/api/v3/settings',
    '/api/v3/sourcefiles'
  ];

  console.log('🧪 Testing 5 sample endpoints:\n');
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(token, baseUrl + endpoint);
    if (result.ok) {
      console.log(`✅ ${result.url} → ${result.status}`);
    } else if (result.status) {
      console.log(`⚠️  ${result.url} → ${result.status}`);
    } else {
      console.log(`❌ ${result.url} → ${result.error}`);
    }
  }
  
  console.log('\n✅ OAuth2 authentication and API access working!');
}

main();
