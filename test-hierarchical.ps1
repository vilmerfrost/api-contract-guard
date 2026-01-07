# Hierarchical API Testing - Example Script
# This script demonstrates how to run hierarchical API tests

Write-Host "🔄 Hierarchical API Testing" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 1: Load environment variables
Write-Host "📋 Step 1: Loading environment variables..." -ForegroundColor Yellow
if (Test-Path .env.local) {
    Get-Content .env.local | ForEach-Object { 
        if ($_ -match '^([^#][^=]+)=(.*)$') { 
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$name" -Value $value 
            Write-Host "  ✓ Loaded: $name" -ForegroundColor Green
        } 
    }
} else {
    Write-Host "  ❌ .env.local file not found!" -ForegroundColor Red
    Write-Host "  Please create .env.local with your API credentials" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Verify required environment variables
Write-Host "🔍 Step 2: Verifying required environment variables..." -ForegroundColor Yellow
$required = @("SWAGGER_URL", "TOKEN_URL", "API_USERNAME", "API_PASSWORD")
$missing = @()

foreach ($var in $required) {
    if ([string]::IsNullOrEmpty((Get-Item -Path "env:$var" -ErrorAction SilentlyContinue).Value)) {
        $missing += $var
        Write-Host "  ❌ Missing: $var" -ForegroundColor Red
    } else {
        Write-Host "  ✓ Found: $var" -ForegroundColor Green
    }
}

if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "❌ Missing required environment variables:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}

Write-Host ""

# Step 3: Build CLI
Write-Host "🔨 Step 3: Building CLI..." -ForegroundColor Yellow
npm run build:cli
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Build successful" -ForegroundColor Green
Write-Host ""

# Step 4: Run hierarchical tests
Write-Host "🚀 Step 4: Running hierarchical tests..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Command:" -ForegroundColor Cyan
Write-Host "  node dist/cli/cli.js test \" -ForegroundColor Gray
Write-Host "    --swagger-url $env:SWAGGER_URL \" -ForegroundColor Gray
Write-Host "    --token-url $env:TOKEN_URL \" -ForegroundColor Gray
Write-Host "    --username $env:API_USERNAME \" -ForegroundColor Gray
Write-Host "    --password ******** \" -ForegroundColor Gray
Write-Host "    --use-hierarchical \" -ForegroundColor Gray
Write-Host "    --mode readonly \" -ForegroundColor Gray
Write-Host "    --output junit-hierarchical.xml" -ForegroundColor Gray
Write-Host ""

node dist/cli/cli.js test `
  --swagger-url $env:SWAGGER_URL `
  --token-url $env:TOKEN_URL `
  --username $env:API_USERNAME `
  --password $env:API_PASSWORD `
  --use-hierarchical `
  --mode readonly `
  --output junit-hierarchical.xml

$exitCode = $LASTEXITCODE

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan

# Step 5: Check results
if ($exitCode -eq 0) {
    Write-Host "✅ All tests passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 JUnit XML report generated: junit-hierarchical.xml" -ForegroundColor Cyan
    
    if (Test-Path junit-hierarchical.xml) {
        $xmlContent = Get-Content junit-hierarchical.xml -Raw
        $xml = [xml]$xmlContent
        $testsuite = $xml.testsuites.testsuite
        
        Write-Host ""
        Write-Host "Test Summary:" -ForegroundColor Cyan
        Write-Host "  Total Tests: $($testsuite.tests)" -ForegroundColor White
        Write-Host "  Passed: $($testsuite.tests - $testsuite.failures - $testsuite.errors)" -ForegroundColor Green
        Write-Host "  Failed: $($testsuite.failures)" -ForegroundColor Red
        Write-Host "  Errors: $($testsuite.errors)" -ForegroundColor Red
        Write-Host "  Duration: $($testsuite.time)s" -ForegroundColor White
    }
} else {
    Write-Host "❌ Some tests failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "📊 JUnit XML report generated: junit-hierarchical.xml" -ForegroundColor Cyan
    Write-Host "   Review the report for detailed failure information" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan

exit $exitCode

