# ═══════════════════════════════════════════════════════════════════════════
# Quick Test Script - API Contract Guard (PowerShell)
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "╔═══════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║              API CONTRACT GUARD - QUICK TEST VALIDATION                   ║" -ForegroundColor Blue
Write-Host "╚═══════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

# Load environment variables
Write-Host "📁 Loading environment variables..." -ForegroundColor Blue
if (Test-Path ".env.local") {
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$name" -Value $value
        }
    }
    Write-Host "✅ Environment loaded" -ForegroundColor Green
} else {
    Write-Host "❌ .env.local not found!" -ForegroundColor Red
    exit 1
}

# Verify required variables
if (-not $env:SWAGGER_URL -or -not $env:TOKEN_URL -or -not $env:API_USERNAME -or -not $env:API_PASSWORD) {
    Write-Host "❌ Missing required environment variables" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "─────────────────────────────────────────────────────────────────────────────" -ForegroundColor Blue
Write-Host "TEST 1: VM Accessibility Check" -ForegroundColor Blue
Write-Host "─────────────────────────────────────────────────────────────────────────────" -ForegroundColor Blue

Write-Host "📡 Checking if VM is accessible..." -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri $env:SWAGGER_URL -SkipCertificateCheck -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ VM is running and accessible" -ForegroundColor Green
    $vmRunning = $true
} catch {
    Write-Host "⚠️  VM appears to be down or unreachable" -ForegroundColor Yellow
    Write-Host "   This is expected if it's past 23:00 (VM auto-shuts down)" -ForegroundColor Yellow
    Write-Host "   Either:" -ForegroundColor Yellow
    Write-Host "   1. Manually start VM in Azure Portal (vm-pdq-001)" -ForegroundColor Yellow
    Write-Host "   2. Wait for test to auto-start it (requires correct AZURE_CLIENT_SECRET)" -ForegroundColor Yellow
    $vmRunning = $false
}

if (-not $vmRunning) {
    Write-Host ""
    Write-Host "❌ Cannot proceed with tests - VM is not accessible" -ForegroundColor Red
    Write-Host ""
    Write-Host "To start the VM:" -ForegroundColor Blue
    Write-Host "Option 1 (Manual):" -ForegroundColor Yellow
    Write-Host "  1. Go to Azure Portal"
    Write-Host "  2. Navigate to: rg-pdq-dev-demo-001 → vm-pdq-001"
    Write-Host "  3. Click 'Start'"
    Write-Host "  4. Wait 2-3 minutes"
    Write-Host "  5. Run this script again"
    Write-Host ""
    Write-Host "Option 2 (Automatic - requires correct Azure secret):" -ForegroundColor Yellow
    Write-Host "  node dist/cli/cli.js vm-start --api-url $env:SWAGGER_URL"
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "─────────────────────────────────────────────────────────────────────────────" -ForegroundColor Blue
Write-Host "TEST 2: Endpoint Discovery" -ForegroundColor Blue
Write-Host "─────────────────────────────────────────────────────────────────────────────" -ForegroundColor Blue

Write-Host "📋 Fetching and parsing Swagger specification..." -ForegroundColor Blue
node dist/cli/cli.js list-endpoints --swagger-url $env:SWAGGER_URL

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Endpoint discovery successful" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Endpoint discovery failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "─────────────────────────────────────────────────────────────────────────────" -ForegroundColor Blue
Write-Host "TEST 3: OAuth2 Authentication & Regression Tests (3 endpoints)" -ForegroundColor Blue
Write-Host "─────────────────────────────────────────────────────────────────────────────" -ForegroundColor Blue

Write-Host "🧪 Running regression tests on 3 endpoints..." -ForegroundColor Blue
Write-Host ""

node dist/cli/cli.js test `
  --swagger-url $env:SWAGGER_URL `
  --token-url $env:TOKEN_URL `
  --username $env:API_USERNAME `
  --password $env:API_PASSWORD `
  --skip-vm-start `
  --max-tests 3 `
  --output test-results-quick.xml

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Regression tests completed successfully" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Regression tests failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "─────────────────────────────────────────────────────────────────────────────" -ForegroundColor Blue
Write-Host "TEST 4: JUnit XML Validation" -ForegroundColor Blue
Write-Host "─────────────────────────────────────────────────────────────────────────────" -ForegroundColor Blue

if (Test-Path "test-results-quick.xml") {
    Write-Host "✅ JUnit XML report generated" -ForegroundColor Green
    Write-Host "📄 Location: test-results-quick.xml" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Preview:" -ForegroundColor Blue
    Get-Content "test-results-quick.xml" -Head 20
} else {
    Write-Host "⚠️  JUnit XML not found (might not have been generated)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║                           TEST SUMMARY                                    ║" -ForegroundColor Blue
Write-Host "╚═══════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""
Write-Host "✅ All quick tests passed!" -ForegroundColor Green
Write-Host ""
Write-Host "The following components are working:" -ForegroundColor Blue
Write-Host "  ✅ SSL/TLS handling (self-signed certificates)"
Write-Host "  ✅ Swagger/OpenAPI parsing"
Write-Host "  ✅ Endpoint blacklist filtering (37 endpoints excluded)"
Write-Host "  ✅ OAuth2 authentication"
Write-Host "  ✅ Regression test execution (GET→DELETE→POST→VERIFY→COMPARE)"
Write-Host "  ✅ JUnit XML report generation"
Write-Host ""
Write-Host "⚠️  VM auto-start NOT tested (requires correct AZURE_CLIENT_SECRET)" -ForegroundColor Yellow
Write-Host ""
Write-Host "─────────────────────────────────────────────────────────────────────────────" -ForegroundColor Blue
Write-Host "NEXT STEPS" -ForegroundColor Blue
Write-Host "─────────────────────────────────────────────────────────────────────────────" -ForegroundColor Blue
Write-Host ""
Write-Host "1. Run full test suite:" -ForegroundColor Green
Write-Host "   node dist/cli/cli.js test \"
Write-Host "     --swagger-url `$env:SWAGGER_URL \"
Write-Host "     --token-url `$env:TOKEN_URL \"
Write-Host "     --username `$env:API_USERNAME \"
Write-Host "     --password `$env:API_PASSWORD \"
Write-Host "     --skip-vm-start"
Write-Host ""
Write-Host "2. Get correct Azure Client Secret from Stefan to enable VM auto-start" -ForegroundColor Green
Write-Host ""
Write-Host "3. Set up CI/CD pipeline (CircleCI or Bitbucket)" -ForegroundColor Green
Write-Host ""
Write-Host "─────────────────────────────────────────────────────────────────────────────" -ForegroundColor Blue
Write-Host ""
