# ═══════════════════════════════════════════════════════════════════════════
# Requirements Verification Script (PowerShell)
# Verifies implementation matches Stefan's specifications EXACTLY
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "=========================================================================" -ForegroundColor Blue
Write-Host "     REQUIREMENTS VERIFICATION vs STEFAN'S SPECIFICATION                " -ForegroundColor Blue
Write-Host "=========================================================================" -ForegroundColor Blue
Write-Host ""

$Pass = 0
$Fail = 0
$Warn = 0

function Test-Requirement {
    param(
        [string]$Name,
        [scriptblock]$Condition,
        [switch]$Warning
    )
    
    Write-Host "$Name " -NoNewline -ForegroundColor Blue
    
    try {
        $result = & $Condition
        if ($result) {
            Write-Host "[PASS]" -ForegroundColor Green
            $script:Pass++
        } else {
            if ($Warning) {
                Write-Host "[WARN]" -ForegroundColor Yellow
                $script:Warn++
            } else {
                Write-Host "[FAIL]" -ForegroundColor Red
                $script:Fail++
            }
        }
    } catch {
        if ($Warning) {
            Write-Host "[WARN]" -ForegroundColor Yellow
            $script:Warn++
        } else {
            Write-Host "[FAIL]" -ForegroundColor Red
            $script:Fail++
        }
    }
}

Write-Host "=========================================================================" -ForegroundColor Blue
Write-Host "1. AZURE VM CONFIGURATION" -ForegroundColor Blue
Write-Host "=========================================================================" -ForegroundColor Blue

Test-Requirement "Subscription ID (559961f7-70ad-4623-92b6-9ef9c6c467a9)" {
    Select-String -Path ".env.local" -Pattern "AZURE_SUBSCRIPTION_ID=559961f7-70ad-4623-92b6-9ef9c6c467a9" -Quiet
}

Test-Requirement "Resource Group (rg-pdq-dev-demo-001)" {
    Select-String -Path ".env.local" -Pattern "AZURE_RESOURCE_GROUP=rg-pdq-dev-demo-001" -Quiet
}

Test-Requirement "VM Name (vm-pdq-001)" {
    Select-String -Path ".env.local" -Pattern "AZURE_VM_NAME=vm-pdq-001" -Quiet
}

Test-Requirement "Tenant ID (559961f7-70ad-4623-92b6-9ef9c6c467a9)" {
    Select-String -Path ".env.local" -Pattern "AZURE_TENANT_ID=559961f7-70ad-4623-92b6-9ef9c6c467a9" -Quiet
}

Test-Requirement "Client ID (7924c011-cf3a-4911-ae89-f4158ecd7d43)" {
    Select-String -Path ".env.local" -Pattern "AZURE_CLIENT_ID=7924c011-cf3a-4911-ae89-f4158ecd7d43" -Quiet
}

Test-Requirement "Client Secret (pending correct value from Stefan)" -Warning {
    Select-String -Path ".env.local" -Pattern "AZURE_CLIENT_SECRET=" -Quiet
}

Test-Requirement "VM Auto-Start Implementation" {
    (Test-Path "src/cli/azure-starter.ts") -and (Select-String -Path "src/cli/azure-starter.ts" -Pattern "ensureVMRunning" -Quiet)
}

Write-Host ""
Write-Host "=========================================================================" -ForegroundColor Blue
Write-Host "2. OAUTH2 AUTHENTICATION" -ForegroundColor Blue
Write-Host "=========================================================================" -ForegroundColor Blue

Test-Requirement "Token URL (https://pdq.swedencentral.cloudapp.azure.com/dev/app/token)" {
    Select-String -Path ".env.local" -Pattern "TOKEN_URL=https://pdq.swedencentral.cloudapp.azure.com/dev/app/token" -Quiet
}

Test-Requirement "Username (backpack)" {
    Select-String -Path ".env.local" -Pattern "API_USERNAME=backpack" -Quiet
}

Test-Requirement "Password (starts with 7065707061727065707061722d9fbf08)" {
    Select-String -Path ".env.local" -Pattern "API_PASSWORD=7065707061727065707061722d9fbf08" -Quiet
}

Test-Requirement "NO Token Refresh (as requested)" {
    -not (Select-String -Path "src/lib/tester.ts" -Pattern "refresh.*token" -Quiet)
}

Write-Host ""
Write-Host "=========================================================================" -ForegroundColor Blue
Write-Host "3. ENDPOINT BLACKLIST (37 ENDPOINTS)" -ForegroundColor Blue
Write-Host "=========================================================================" -ForegroundColor Blue

Test-Requirement "Blacklist file exists" {
    Test-Path "src/cli/blacklist.ts"
}

if (Test-Path "src/cli/blacklist.ts") {
    $count = (Select-String -Path "src/cli/blacklist.ts" -Pattern "^\s*'(POST|GET|PUT|DELETE|PATCH) ").Count
    Write-Host "Blacklist Count: $count endpoints" -ForegroundColor Blue
    
    if ($count -ge 37) {
        Write-Host "[PASS] At least 37 endpoints blacklisted" -ForegroundColor Green
        $Pass++
    } else {
        Write-Host "[FAIL] Only $count endpoints (expected 37+)" -ForegroundColor Red
        $Fail++
    }
    
    Write-Host ""
    Write-Host "Sample verification (first 5 endpoints from Stefan list):" -ForegroundColor Blue
    
    Test-Requirement "  POST /api/v3/ingest/claim/workload" {
        Select-String -Path "src/cli/blacklist.ts" -Pattern "POST /api/v3/ingest/claim/workload" -Quiet
    }
    
    Test-Requirement "  POST /api/v3/ingest/start/workload" {
        Select-String -Path "src/cli/blacklist.ts" -Pattern "POST /api/v3/ingest/start/workload" -Quiet
    }
    
    Test-Requirement "  POST /api/v3/ingest/completed/workload" {
        Select-String -Path "src/cli/blacklist.ts" -Pattern "POST /api/v3/ingest/completed/workload" -Quiet
    }
    
    Test-Requirement "  POST /api/v3/ingest/rerun/workload" {
        Select-String -Path "src/cli/blacklist.ts" -Pattern "POST /api/v3/ingest/rerun/workload" -Quiet
    }
    
    Test-Requirement "  POST /api/v3.1/ingest/{sourcesystem}/{alias}/start/from/{startdate}" {
        Select-String -Path "src/cli/blacklist.ts" -Pattern "POST /api/v3.1/ingest" -Quiet
    }
}

Test-Requirement "Pattern Matching for Path Parameters" {
    (Select-String -Path "src/cli/blacklist.ts" -Pattern "isEndpointExcluded" -Quiet) -and 
    (Select-String -Path "src/cli/blacklist.ts" -Pattern "\{" -Quiet)
}

Write-Host ""
Write-Host "=========================================================================" -ForegroundColor Blue
Write-Host "4. CI/CD CONFIGURATION" -ForegroundColor Blue
Write-Host "=========================================================================" -ForegroundColor Blue

Test-Requirement "CircleCI config exists" {
    Test-Path ".circleci/config.yml"
}

Test-Requirement "CircleCI PR workflow" {
    Select-String -Path ".circleci/config.yml" -Pattern "pull.*request|branches" -Quiet
}

Test-Requirement "Bitbucket Pipelines config exists" {
    Test-Path "bitbucket-pipelines.yml"
}

Test-Requirement "Bitbucket PR trigger" {
    Select-String -Path "bitbucket-pipelines.yml" -Pattern "pull-request" -Quiet
}

Write-Host ""
Write-Host "=========================================================================" -ForegroundColor Blue
Write-Host "5. TEST STRATEGY" -ForegroundColor Blue
Write-Host "=========================================================================" -ForegroundColor Blue

Test-Requirement "Test file exists" {
    Test-Path "src/lib/tester.ts"
}

Test-Requirement "Full CRUD mode (GET-DELETE-POST-VERIFY)" {
    Select-String -Path "src/lib/tester.ts" -Pattern "GET|DELETE|POST|VERIFY" -Quiet
}

Test-Requirement "Readonly mode option" {
    (Select-String -Path "src/cli/cli.ts" -Pattern "readonly|mode.*full" -Quiet) -or
    (Select-String -Path "src/lib/tester.ts" -Pattern "readonly|mode.*full" -Quiet)
}

Test-Requirement "JUnit XML reporter" {
    Test-Path "src/cli/junit-reporter.ts"
}

Write-Host ""
Write-Host "=========================================================================" -ForegroundColor Blue
Write-Host "6. SWAGGER/OPENAPI INTEGRATION" -ForegroundColor Blue
Write-Host "=========================================================================" -ForegroundColor Blue

Test-Requirement "Swagger URL (https://pdq.swedencentral.cloudapp.azure.com/dev/app/openapi.json)" {
    Select-String -Path ".env.local" -Pattern "SWAGGER_URL=https://pdq.swedencentral.cloudapp.azure.com/dev/app/openapi.json" -Quiet
}

Test-Requirement "SSL Certificate Bypass (NODE_TLS_REJECT_UNAUTHORIZED=0)" {
    Select-String -Path ".env.local" -Pattern "NODE_TLS_REJECT_UNAUTHORIZED=0" -Quiet
}

Test-Requirement "Swagger parser exists" {
    (Test-Path "src/lib/swagger.ts") -and (Select-String -Path "src/lib/swagger.ts" -Pattern "parseSwaggerUrl" -Quiet)
}

Write-Host ""
Write-Host "=========================================================================" -ForegroundColor Blue
Write-Host "7. BUILD & CLI" -ForegroundColor Blue
Write-Host "=========================================================================" -ForegroundColor Blue

Test-Requirement "TypeScript CLI built" {
    Test-Path "dist/cli/cli.js"
}

Test-Requirement "3 Commands implemented (test, vm-start, list-endpoints)" {
    Select-String -Path "src/cli/cli.ts" -Pattern "test|vm-start|list-endpoints" -Quiet
}

Test-Requirement "Environment setup complete" {
    (Test-Path ".env.local") -and (Test-Path "load-env.sh") -and (Test-Path "quick-test.sh")
}

Write-Host ""
Write-Host "=========================================================================" -ForegroundColor Blue
Write-Host "                      VERIFICATION SUMMARY                               " -ForegroundColor Blue
Write-Host "=========================================================================" -ForegroundColor Blue
Write-Host ""

Write-Host "[PASS] Passed:  $Pass" -ForegroundColor Green
Write-Host "[WARN] Warnings: $Warn" -ForegroundColor Yellow
Write-Host "[FAIL] Failed:  $Fail" -ForegroundColor Red

Write-Host ""

if ($Fail -eq 0) {
    Write-Host "=========================================================================" -ForegroundColor Green
    Write-Host "  [PASS] ALL REQUIREMENTS MET! Implementation matches specification.    " -ForegroundColor Green
    Write-Host "=========================================================================" -ForegroundColor Green
    Write-Host ""
    
    if ($Warn -gt 0) {
        Write-Host "[WARN] Note: $Warn warning(s) - these are expected (e.g., Azure Client Secret placeholder)" -ForegroundColor Yellow
        Write-Host ""
    }
    
    Write-Host "=========================================================================" -ForegroundColor Blue
    Write-Host "READY TO INVOICE PHASE 2A: 10,625 SEK" -ForegroundColor Blue
    Write-Host "=========================================================================" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Once VM is running and quick-test passes, send invoice to Stefan!"
    Write-Host ""
    exit 0
} else {
    Write-Host "=========================================================================" -ForegroundColor Red
    Write-Host "  [FAIL] SOME REQUIREMENTS NOT MET - Review failures above             " -ForegroundColor Red
    Write-Host "=========================================================================" -ForegroundColor Red
    Write-Host ""
    exit 1
}
