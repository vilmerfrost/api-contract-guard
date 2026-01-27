# GitHub Actions Setup Guide

This guide explains how to set up GitHub Actions for API Contract Guard.

## Quick Setup

### 1. Add Repository Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `SWAGGER_URL` | `https://pdq.swedencentral.cloudapp.azure.com/dev/app/openapi.json` | OpenAPI/Swagger spec URL |
| `TOKEN_URL` | `https://pdq.swedencentral.cloudapp.azure.com/dev/app/token` | OAuth2 token endpoint |
| `API_USERNAME` | `backpack` | OAuth2 username |
| `API_PASSWORD` | `your-password-here` | OAuth2 password |
| `SLACK_WEBHOOK_URL` | (optional) | Slack webhook for notifications |

### 2. Workflow Files

Two workflow files are created:

#### `api-tests.yml` - PR and Push Tests
- **Triggers**: Pull requests, pushes to main/master
- **Runs**: Readonly regression tests by default
- **Manual options**: Can switch to full CRUD or POST fixture tests

#### `scheduled-tests.yml` - Daily Scheduled Tests  
- **Triggers**: Daily at 08:00 UTC (when VM is up)
- **Runs**: Both regression tests and POST fixture tests
- **Features**: API availability check, Slack notifications

## Usage

### Automatic (on PR/Push)

Tests run automatically when you:
- Open a pull request
- Push to `main`, `master`, or `develop`

### Manual Trigger

1. Go to **Actions** tab in your repository
2. Select **"API Contract Tests"** workflow
3. Click **"Run workflow"**
4. Choose options:
   - **Test mode**: `readonly` (safe) or `full` (CRUD)
   - **Run POST tests**: Enable to test POST endpoints with fixtures

### View Results

- **Check run**: See pass/fail in the PR checks
- **Artifacts**: Download `test-results.xml` from the workflow run
- **Test Report**: View detailed results in the "Test Report" check

## Workflow Configuration

### Test Modes

| Mode | Description | Safe for Production? |
|------|-------------|---------------------|
| `readonly` | GET requests only | ✅ Yes |
| `full` | Full CRUD (GET→DELETE→POST→VERIFY) | ⚠️ No |
| `test-posts` | POST with predefined fixtures | ⚠️ No |

### Environment Variables

Set these in the workflow if needed:

```yaml
env:
  NODE_TLS_REJECT_UNAUTHORIZED: '0'  # Allow self-signed certs
  DEBUG_DISCOVERY: 'true'            # Enable debug logging
```

## Customization

### Change Schedule

Edit `scheduled-tests.yml` to change when tests run:

```yaml
on:
  schedule:
    # Run at 08:00 UTC Monday-Friday
    - cron: '0 8 * * 1-5'
```

### Test Only Specific Modules

Modify the workflow to test specific POST modules:

```yaml
- name: Run POST Tests for Model Module Only
  run: |
    node dist/cli/cli.js test-posts \
      --swagger-url "${{ secrets.SWAGGER_URL }}" \
      --token-url "${{ secrets.TOKEN_URL }}" \
      --username "${{ secrets.API_USERNAME }}" \
      --password "${{ secrets.API_PASSWORD }}" \
      --no-auto-start-vm \
      --module Model \
      --output model-tests.xml
```

### Add Branch Protection

Require tests to pass before merging:

1. Go to **Settings** → **Branches** → **Add rule**
2. Select branch pattern (e.g., `main`)
3. Enable **"Require status checks to pass"**
4. Select **"API Contract Regression Tests"**

## Troubleshooting

### Tests Timeout

The Azure VM shuts down at 23:00. If tests run during downtime:
- Schedule tests during business hours (07:00-22:00 CET)
- The scheduled workflow checks API availability first

### Authentication Fails

1. Verify secrets are set correctly
2. Check the password hasn't expired
3. Ensure username is correct (`backpack`)

### SSL Certificate Errors

Already handled with `NODE_TLS_REJECT_UNAUTHORIZED: '0'`

## Example PR Check Output

```
✅ API Contract Regression Tests
   Total: 72 | Passed: 65 | Failed: 7 | Skipped: 37
   Duration: 45.2s
   
   Failed:
   ❌ GET /api/v2/model/Artist/attributes/1 [404]
   ❌ GET /api/v3/schedule/by-time [400]
   ...
```

## Support

For issues with:
- **API responses**: Contact Stefan
- **Test logic**: Check `src/lib/tester.ts`
- **POST fixtures**: Check `src/lib/test-fixtures.ts`
- **Blacklist**: Check `src/cli/blacklist.ts`
