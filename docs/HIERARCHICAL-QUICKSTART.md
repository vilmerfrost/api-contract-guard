# 🚀 Hierarchical Testing - Quick Start

## What It Does

Tests **parent-child API relationships** by:
1. Fetching all resources from parent APIs (e.g., `/api/v2/systems` → returns all systems)
2. Looping through EACH resource
3. Testing all child APIs with that resource ID

**Result**: Comprehensive testing of all API dependencies instead of just testing with one ID.

---

## Quick Start

### 1. Load Environment Variables

```powershell
Get-Content .env.local | ForEach-Object { 
  if ($_ -match '^([^#][^=]+)=(.*)$') { 
    $name = $matches[1].Trim()
    $value = $matches[2].Trim()
    Set-Item -Path "env:$name" -Value $value 
  } 
}
```

### 2. Run Hierarchical Tests (Readonly Mode - Recommended)

```powershell
node dist/cli/cli.js test `
  --swagger-url $env:SWAGGER_URL `
  --token-url $env:TOKEN_URL `
  --username $env:API_USERNAME `
  --password $env:API_PASSWORD `
  --use-hierarchical `
  --mode readonly `
  --output junit-hierarchical.xml
```

### 3. View Results

```powershell
# Console output shows:
# - Parent APIs tested
# - All discovered resources
# - All child APIs tested per resource
# - Total test count

# JUnit XML report for CI/CD
cat junit-hierarchical.xml
```

---

## What Gets Tested

### Systems Hierarchy
```
GET /api/v2/systems → [SYS001, SYS002, SYS003, ...]

For EACH system (SYS001, SYS002, SYS003, ...):
  ✓ GET /api/v2/systems/{system}
  ✓ GET /api/v3/ingest/connection/for/{sourcesystem}
  ✓ GET /api/v3/ingest/list/for/{sourcesystem}
  ✓ GET /api/v3/ingest/next/workload/for/{sourcesystem}
  ✓ GET /api/v3/ingest/workload/history/for/{sourcesystem}
  ✓ GET /api/v3/ingest/workload/inprogress/for/{sourcesystem}
  ✓ GET /api/v3.1/ingest/list/for/{sourcesystem}
```

### Sourcefiles Hierarchy
```
GET /api/v2/sourcefiles → [FILE001, FILE002, FILE003, ...]

For EACH sourcefile (FILE001, FILE002, FILE003, ...):
  ✓ GET /api/v2/sourcefiles/{sourcefile}
  ✓ GET /api/v2/sourcefiles/{sourcefile}/mappings
  ✓ GET /api/v2/sourcefiles/{sourcefile}/relationships
  ✓ GET /api/v3/sourcefiles/{sourcefile}/mappings/groups
  ✓ GET /api/v2/master/schedule/{sourcefile}
  ✓ GET /api/v2/schedule/{sourcefile}
  ✓ GET /api/v2/schedule/{sourcefile}/type
  ✓ GET /api/v2/schedule/{sourcefile}/nextstep
  ✓ GET /api/v2/schedule/{sourcefile}/state
```

---

## Key Features

### ✅ Real Data Testing
- Uses actual resource IDs from your API
- Tests all parent-child relationships
- Catches issues with specific resource IDs

### ✅ Version Fallback
- If v3 doesn't exist, uses v2 (earliest available version)
- Automatically handles version compatibility
- Example: If `/api/v3.1/...` doesn't exist, tries `/api/v3/...`

### ✅ Comprehensive Coverage
- Tests ALL parent resources, not just one
- Shows which specific resource ID fails
- Generates detailed JUnit XML reports

---

## Expected Output

```
═══════════════════════════════════════
  DISCOVERING HIERARCHICAL TEST DATA
═══════════════════════════════════════

  🔐 Fetching OAuth2 token for hierarchical discovery...
    ✅ OAuth2 token obtained

  🔍 Fetching parent API: /api/v2/systems
     Get All Systems
    ✅ Found 8 resources
    📋 Will test 7 child APIs per resource
    🎯 Total child tests: 56

  🔍 Fetching parent API: /api/v2/sourcefiles
     Get All Sourcefiles
    ✅ Found 15 resources
    📋 Will test 9 child APIs per resource
    🎯 Total child tests: 135

═══════════════════════════════════════
HIERARCHICAL DISCOVERY SUMMARY:
  Get All Systems:
    Resources: 8
    Child APIs: 7
    Total Tests: 56

  Get All Sourcefiles:
    Resources: 15
    Child APIs: 9
    Total Tests: 135

  TOTAL PARENT RESOURCES: 23
  TOTAL CHILD API TESTS: 191
═══════════════════════════════════════

🔄 Running hierarchical tests (parent → child loop)

📊 Total hierarchical tests: 193
```

---

## Adding More Hierarchies

Edit `src/lib/hierarchical-apis.ts`:

```typescript
export const HIERARCHICAL_API_DEFINITIONS: ParentApiDefinition[] = [
  {
    parentPath: '/api/v2/your-parent-endpoint',
    idField: 'resourceId', // Field name in parent response
    alternativeIdFields: ['id', 'name'], // Alternative field names
    description: 'Get All Your Resources',
    childApis: [
      {
        pathPattern: '/api/v{version}/your-child/{resourceId}',
        parameterName: 'resourceId',
        versions: ['2', '3'], // First version = fallback
        description: 'Get Your Child Resource'
      },
      // Add more child APIs...
    ]
  },
  // Add more parent-child relationships...
];
```

Then rebuild:
```powershell
npm run build:cli
```

---

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--use-hierarchical` | Enable hierarchical testing | `false` |
| `--mode readonly` | Only test GET endpoints (recommended) | `full` |
| `--output <file>` | JUnit XML output file | `junit.xml` |

---

## Troubleshooting

### Issue: Too many tests
**Solution**: Limit resources in `src/lib/data-discovery.ts`
```typescript
const resources = items.slice(0, 5); // Test first 5 only
```

### Issue: Some APIs fail
**Check**:
- OAuth2 token has sufficient permissions
- Token is not expired (hierarchical tests can take a while)
- API is accessible from your network

---

## 📝 Summary

**Before** (standard testing):
```
✓ GET /api/v2/systems/1  ← Always uses "1"
✓ GET /api/v2/sourcefiles/1
```

**After** (hierarchical testing):
```
✓ GET /api/v2/systems/SYS001
✓ GET /api/v2/systems/SYS002
✓ GET /api/v2/systems/SYS003
... and 7 child APIs per system

✓ GET /api/v2/sourcefiles/FILE001
✓ GET /api/v2/sourcefiles/FILE002
✓ GET /api/v2/sourcefiles/FILE003
... and 9 child APIs per sourcefile
```

**Result**: Complete API coverage with real data! 🎉

---

## Next Steps

1. ✅ Run hierarchical tests with your API
2. ✅ Review the discovered resources
3. ✅ Check JUnit XML report
4. ✅ Integrate with CI/CD pipeline

For more details, see **HIERARCHICAL-TESTING.md**

