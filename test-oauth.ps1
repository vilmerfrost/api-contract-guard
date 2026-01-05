# Test OAuth2 Authentication - PowerShell Version
# Based on Stefan's working implementation

Write-Host "╔═══════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║                     OAuth2 AUTHENTICATION TEST                            ║" -ForegroundColor Blue
Write-Host "╚═══════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

# Load environment variables
Write-Host "📁 Loading credentials from .env.local..." -ForegroundColor Blue
if (Test-Path ".env.local") {
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$name" -Value $value
        }
    }
    Write-Host "✅ Credentials loaded" -ForegroundColor Green
} else {
    Write-Host "❌ .env.local not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔐 Testing OAuth2 authentication..." -ForegroundColor Blue
Write-Host "Token URL: $env:TOKEN_URL" -ForegroundColor Gray
Write-Host "Username: $env:API_USERNAME" -ForegroundColor Gray
Write-Host "Password: $($env:API_PASSWORD.Substring(0, 20))..." -ForegroundColor Gray
Write-Host ""

# Build form data (matching Stefan's implementation)
$body = "grant_type=password&username=$env:API_USERNAME&password=$env:API_PASSWORD"

Write-Host "📤 Sending POST request..." -ForegroundColor Blue
Write-Host "Method: POST" -ForegroundColor Gray
Write-Host "Content-Type: application/x-www-form-urlencoded" -ForegroundColor Gray
Write-Host ""

try {
    # Use Invoke-WebRequest with form data
    $response = Invoke-WebRequest `
        -Uri $env:TOKEN_URL `
        -Method POST `
        -ContentType "application/x-www-form-urlencoded" `
        -Body $body `
        -SkipCertificateCheck `
        -ErrorAction Stop
    
    $data = $response.Content | ConvertFrom-Json
    
    if ($data.access_token) {
        Write-Host "╔═══════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║                        ✅ OAuth2 SUCCESS!                                 ║" -ForegroundColor Green
        Write-Host "╚═══════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
        Write-Host ""
        
        $tokenPreview = $data.access_token.Substring(0, [Math]::Min(50, $data.access_token.Length))
        Write-Host "✅ Access Token: $tokenPreview..." -ForegroundColor Green
        Write-Host "✅ Token Type: $($data.token_type)" -ForegroundColor Green
        Write-Host "✅ Expires In: $($data.expires_in) seconds ($([Math]::Round($data.expires_in / 3600, 1)) hours)" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "─────────────────────────────────────────────────────────────────────────────" -ForegroundColor Blue
        Write-Host "NEXT STEP: Run the full test suite!" -ForegroundColor Blue
        Write-Host "─────────────────────────────────────────────────────────────────────────────" -ForegroundColor Blue
        Write-Host ""
        Write-Host "npm run build:cli" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "node dist/cli/cli.js test ``" -ForegroundColor Yellow
        Write-Host "  --swagger-url `$env:SWAGGER_URL ``" -ForegroundColor Yellow
        Write-Host "  --token-url `$env:TOKEN_URL ``" -ForegroundColor Yellow
        Write-Host "  --username `$env:API_USERNAME ``" -ForegroundColor Yellow
        Write-Host "  --password `$env:API_PASSWORD ``" -ForegroundColor Yellow
        Write-Host "  --skip-vm-start ``" -ForegroundColor Yellow
        Write-Host "  --max-tests 3" -ForegroundColor Yellow
        Write-Host ""
        
        exit 0
    } else {
        Write-Host "❌ No access_token in response!" -ForegroundColor Red
        Write-Host "Response: $($response.Content)" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "╔═══════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║                        ❌ OAuth2 FAILED!                                  ║" -ForegroundColor Red
    Write-Host "╚═══════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    
    Write-Host "Error Details:" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Status Description: $($_.Exception.Response.StatusDescription)" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body:" -ForegroundColor Red
        Write-Host $responseBody -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Common Issues:" -ForegroundColor Yellow
    Write-Host "1. Check credentials in .env.local" -ForegroundColor Yellow
    Write-Host "2. Verify TOKEN_URL is correct" -ForegroundColor Yellow
    Write-Host "3. Ensure VM is running (Stefan said it's up)" -ForegroundColor Yellow
    Write-Host "4. Check password is complete (256 characters)" -ForegroundColor Yellow
    Write-Host ""
    
    exit 1
}
