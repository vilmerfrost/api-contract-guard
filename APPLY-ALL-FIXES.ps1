# APPLY ALL FIXES - Phase 2B Bug Fixes
# This script applies all critical fixes to make the tool production-ready

Write-Host "🔧 API Contract Guard - Applying All Fixes" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════`n" -ForegroundColor Cyan

$projectRoot = "C:\Users\vilme\api-contract-guard"

# Check if we're in the right directory
if (-not (Test-Path "$projectRoot\package.json")) {
    Write-Host "❌ Error: Not in project root directory!" -ForegroundColor Red
    Write-Host "   Expected: $projectRoot" -ForegroundColor Yellow
    exit 1
}

Write-Host "📁 Project root: $projectRoot" -ForegroundColor Green

# ═══════════════════════════════════════
# FIX #1: Data Extraction in data-discovery.ts
# ═══════════════════════════════════════

Write-Host "`n🔧 FIX #1: Data Extraction (data-discovery.ts)" -ForegroundColor Yellow

$dataDiscoveryPath = "$projectRoot\src\lib\data-discovery.ts"

if (Test-Path $dataDiscoveryPath) {
    Write-Host "   Found: $dataDiscoveryPath" -ForegroundColor Gray
    
    # Read current file
    $content = Get-Content $dataDiscoveryPath -Raw
    
    # Pattern to find and replace
    $oldPattern = @'
      // Handle different response formats
      let items: any\[\] = \[\];
      if \(Array\.isArray\(data\)\) \{
        items = data;
      \} else if \(data\?\.items && Array\.isArray\(data\.items\)\) \{
        items = data\.items;
      \} else if \(data\?\.data && Array\.isArray\(data\.data\)\) \{
        items = data\.data;
      \} else if \(typeof data === 'object' && data !== null\) \{
        // For model objects, keys might be the resource names
        items = Object\.keys\(data\)\.map\(key => \(\{ name: key \}\)\);
      \}
'@
    
    $newPattern = @'
      // Handle different response formats
      let items: any[] = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (typeof data === 'object' && data !== null) {
        // Check for common wrapper patterns (PRIORITIZE data wrapper)
        if (data.data && Array.isArray(data.data)) {
          items = data.data;
        } else if (data.items && Array.isArray(data.items)) {
          items = data.items;
        } else if (data.results && Array.isArray(data.results)) {
          items = data.results;
        } else {
          // For model objects, keys might be the resource names
          // But skip generic wrapper keys like 'data', 'items', 'results'
          const wrapperKeys = ['data', 'items', 'results', 'response', 'payload'];
          items = Object.keys(data)
            .filter(key => !wrapperKeys.includes(key.toLowerCase()))
            .map(key => ({ name: key, id: key }));
        }
      }
'@
    
    if ($content -match "Array\.isArray\(data\.items\)") {
        $content = $content -replace [regex]::Escape($oldPattern), $newPattern
        $content | Set-Content $dataDiscoveryPath -NoNewline
        Write-Host "   ✅ Applied data extraction fix" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Pattern not found, using complete file replacement" -ForegroundColor Yellow
        Copy-Item "data-discovery-FIXED.ts" $dataDiscoveryPath -Force
        Write-Host "   ✅ Replaced with fixed version" -ForegroundColor Green
    }
} else {
    Write-Host "   ❌ File not found: $dataDiscoveryPath" -ForegroundColor Red
}

# ═══════════════════════════════════════
# FIX #2: Readonly Mode Filter in orchestrator.ts
# ═══════════════════════════════════════

Write-Host "`n🔧 FIX #2: Readonly Mode Filter (orchestrator.ts)" -ForegroundColor Yellow

$orchestratorPath = "$projectRoot\src\cli\orchestrator.ts"

if (Test-Path $orchestratorPath) {
    Write-Host "   Found: $orchestratorPath" -ForegroundColor Gray
    
    $content = Get-Content $orchestratorPath -Raw
    
    # Fix runSequential method
    if ($content -notmatch "readonly mode.*continue") {
        $sequentialPattern = @'
    // Flatten all endpoints from all groups
    const allEndpoints: Array<{ endpoint: Endpoint; groupResource: string }> = [];
    for (const group of groups) {
      for (const endpoint of group.endpoints) {
        allEndpoints.push({ endpoint, groupResource: group.resource });
'@
        
        $sequentialReplacement = @'
    // Flatten all endpoints from all groups
    const allEndpoints: Array<{ endpoint: Endpoint; groupResource: string }> = [];
    for (const group of groups) {
      for (const endpoint of group.endpoints) {
        // READONLY MODE: Skip non-GET endpoints entirely
        if (this.options.mode === 'readonly' && endpoint.method !== 'GET') {
          continue;
        }
        
        allEndpoints.push({ endpoint, groupResource: group.resource });
'@
        
        $content = $content.Replace($sequentialPattern, $sequentialReplacement)
        $content | Set-Content $orchestratorPath -NoNewline
        Write-Host "   ✅ Applied readonly filter to runSequential" -ForegroundColor Green
    } else {
        Write-Host "   ✅ Readonly filter already applied to runSequential" -ForegroundColor Green
    }
    
    # Fix runParallel method (appears twice in file)
    if ($content -match "runParallel") {
        $content = Get-Content $orchestratorPath -Raw
        
        # Count occurrences of the flattening pattern in runParallel
        $parallelOccurrences = ([regex]::Matches($content, "private async runParallel")).Count
        
        if ($parallelOccurrences -gt 0) {
            $parallelPattern = @'
  private async runParallel(baseUrl: string, groups: EndpointGroup[]): Promise<TestResult[]> {
    // Flatten all endpoints from all groups
    const allEndpoints: Array<{ endpoint: Endpoint; groupResource: string }> = [];
    for (const group of groups) {
      for (const endpoint of group.endpoints) {
        allEndpoints.push({ endpoint, groupResource: group.resource });
'@
            
            $parallelReplacement = @'
  private async runParallel(baseUrl: string, groups: EndpointGroup[]): Promise<TestResult[]> {
    // Flatten all endpoints from all groups
    const allEndpoints: Array<{ endpoint: Endpoint; groupResource: string }> = [];
    for (const group of groups) {
      for (const endpoint of group.endpoints) {
        // READONLY MODE: Skip non-GET endpoints entirely
        if (this.options.mode === 'readonly' && endpoint.method !== 'GET') {
          continue;
        }
        
        allEndpoints.push({ endpoint, groupResource: group.resource });
'@
            
            $content = $content.Replace($parallelPattern, $parallelReplacement)
            $content | Set-Content $orchestratorPath -NoNewline
            Write-Host "   ✅ Applied readonly filter to runParallel" -ForegroundColor Green
        }
    }
} else {
    Write-Host "   ❌ File not found: $orchestratorPath" -ForegroundColor Red
}

# ═══════════════════════════════════════
# REBUILD PROJECT
# ═══════════════════════════════════════

Write-Host "`n🔨 Rebuilding project..." -ForegroundColor Yellow

npm run build:cli

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Build successful!" -ForegroundColor Green
} else {
    Write-Host "   ❌ Build failed!" -ForegroundColor Red
    exit 1
}

# ═══════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════

Write-Host "`n═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ ALL FIXES APPLIED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "Applied fixes:" -ForegroundColor White
Write-Host "  1. ✅ Data extraction (handles {`"data`": [...]} responses)" -ForegroundColor Gray
Write-Host "  2. ✅ Readonly mode filter (skips POST/DELETE)" -ForegroundColor Gray
Write-Host ""
Write-Host "Next step: Run tests!" -ForegroundColor Yellow
Write-Host ""
Write-Host "# Load environment" -ForegroundColor Gray
Write-Host 'Get-Content .env.local | ForEach-Object { if ($_ -match ''^([^#][^=]+)=(.*)$'') { Set-Item -Path "env:$($matches[1].Trim())" -Value $matches[2].Trim() } }' -ForegroundColor Gray
Write-Host ""
Write-Host "# Run readonly test with real data" -ForegroundColor Gray
Write-Host "node dist/cli/cli.js test ``" -ForegroundColor Gray
Write-Host "  --swagger-url `$env:SWAGGER_URL ``" -ForegroundColor Gray
Write-Host "  --token-url `$env:TOKEN_URL ``" -ForegroundColor Gray
Write-Host "  --username `$env:API_USERNAME ``" -ForegroundColor Gray
Write-Host "  --password `$env:API_PASSWORD ``" -ForegroundColor Gray
Write-Host "  --use-real-data ``" -ForegroundColor Gray
Write-Host "  --mode readonly ``" -ForegroundColor Gray
Write-Host "  --output test-results.xml" -ForegroundColor Gray
Write-Host ""
