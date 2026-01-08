# API Contract Guard - Test Runner for PowerShell
# This script loads environment variables and runs tests

Write-Host "🚀 API Contract Guard - Test Runner" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════`n" -ForegroundColor Cyan

# Load environment variables from .env.local
Write-Host "📝 Loading environment variables from .env.local..." -ForegroundColor Yellow
if (Test-Path .env.local) {
    Get-Content .env.local | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$key" -Value $value
            Write-Host "   ✓ Loaded: $key" -ForegroundColor Green
        }
    }
    Write-Host ""
} else {
    Write-Host "❌ Error: .env.local not found!" -ForegroundColor Red
    exit 1
}

# Check if CLI is built
if (-not (Test-Path "dist/cli/cli.js")) {
    Write-Host "🔨 Building CLI..." -ForegroundColor Yellow
    npm run build:cli
    Write-Host ""
}

# Enable debug discovery (optional)
$env:DEBUG_DISCOVERY = "true"

# Run tests
Write-Host "🧪 Running tests with real data discovery..." -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════`n" -ForegroundColor Cyan

node dist/cli/cli.js test `
  --swagger-url $env:SWAGGER_URL `
  --token-url $env:TOKEN_URL `
  --username $env:API_USERNAME `
  --password $env:API_PASSWORD `
  --use-real-data `
  --mode readonly `
  --parallel `
  --max-parallel 5 `
  --output test-results.xml

Write-Host "`n═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Test run complete!" -ForegroundColor Green
Write-Host "📊 Results saved to: test-results.xml" -ForegroundColor Yellow

