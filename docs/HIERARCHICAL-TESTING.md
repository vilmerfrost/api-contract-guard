# 🔄 Hierarchical API Testing

## Overview

**Hierarchical API Testing** is a powerful feature that tests parent-child API relationships by:

1. **Fetching parent resources** - Gets all items from parent APIs (e.g., `/api/v2/systems`)
2. **Looping through each resource** - Uses each parent resource ID as input for child APIs
3. **Testing child APIs** - Tests all child endpoints for each parent resource
4. **Version fallback** - If a higher version doesn't exist, uses the earliest available version

This ensures comprehensive testing of all API dependencies and relationships.

---

## 🎯 Use Cases

### 1. Systems Hierarchy
```
GET /api/v2/systems
  → Returns: [SYS001, SYS002, SYS003, ...]
  
For EACH system:
  ✓ GET /api/v2/systems/{system}
  ✓ GET /api/v3/ingest/connection/for/{sourcesystem}
  ✓ GET /api/v3/ingest/list/for/{sourcesystem}
  ✓ GET /api/v3/ingest/next/workload/for/{sourcesystem}
  ✓ GET /api/v3/ingest/workload/history/for/{sourcesystem}
  ✓ GET /api/v3/ingest/workload/inprogress/for/{sourcesystem}
  ✓ GET /api/v3.1/ingest/list/for/{sourcesystem}
```

### 2. Sourcefiles Hierarchy
```
GET /api/v2/sourcefiles
  → Returns: [FILE001, FILE002, FILE003, ...]
  
For EACH sourcefile:
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

## 🚀 How to Use

### Basic Command

```powershell
# Load environment variables
Get-Content .env.local | ForEach-Object { 
  if ($_ -match '^([^#][^=]+)=(.*)$') { 
    $name = $matches[1].Trim()
    $value = $matches[2].Trim()
    Set-Item -Path "env:$name" -Value $value 
  } 
}

# Run hierarchical tests
node dist/cli/cli.js test `
  --swagger-url $env:SWAGGER_URL `
  --token-url $env:TOKEN_URL `
  --username $env:API_USERNAME `
  --password $env:API_PASSWORD `
  --use-hierarchical `
  --output junit.xml
```

### Hierarchical + Readonly Mode

Test only GET endpoints (no CRUD operations):

```powershell
node dist/cli/cli.js test `
  --swagger-url $env:SWAGGER_URL `
  --token-url $env:TOKEN_URL `
  --username $env:API_USERNAME `
  --password $env:API_PASSWORD `
  --use-hierarchical `
  --mode readonly `
  --output junit.xml
```

---

## 📊 Output Example

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
       • SYS001 (System Alpha)
       • SYS002 (System Beta)
       • SYS003 (System Gamma)

  🔍 Fetching parent API: /api/v2/sourcefiles
     Get All Sourcefiles
    ✅ Found 15 resources
    📋 Will test 9 child APIs per resource
    🎯 Total child tests: 135
       • FILE001 (SourceFile1)
       • FILE002 (SourceFile2)
       • FILE003 (SourceFile3)

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

═══════════════════════════════════════
  TESTING: Get All Systems
  Parent: /api/v2/systems
  Resources: 8
  Child APIs per resource: 7
═══════════════════════════════════════

[1/193] Testing parent: GET /api/v2/systems
  ✓ GET: 200
  ✅ PASSED (234ms)

📋 Testing child APIs for resource: SYS001 (System Alpha)

[2/193] Testing: GET /api/v2/systems/SYS001
  ✓ GET: 200
  ✅ PASSED (156ms)

[3/193] Testing: GET /api/v3/ingest/connection/for/SYS001
  ✓ GET: 200
  ✅ PASSED (189ms)

[4/193] Testing: GET /api/v3/ingest/list/for/SYS001
  ✓ GET: 200
  ✅ PASSED (203ms)

... (continues for all resources and child APIs)
```

---

## ⚙️ Configuration

### Adding New Hierarchical Relationships

Edit `src/lib/hierarchical-apis.ts` to add new parent-child relationships:

```typescript
export const HIERARCHICAL_API_DEFINITIONS: ParentApiDefinition[] = [
  {
    parentPath: '/api/v2/systems',
    idField: 'system',
    alternativeIdFields: ['id', 'systemId', 'name'],
    description: 'Get All Systems',
    childApis: [
      {
        pathPattern: '/api/v{version}/systems/{system}',
        parameterName: 'system',
        versions: ['2', '3'],
        description: 'Get Systems'
      },
      // Add more child APIs here...
    ]
  },
  // Add more parent-child relationships here...
];
```

### Version Fallback Logic

The system automatically handles version fallback:

- **Child API versions**: `['3.1', '3', '2']` (listed in order of preference)
- **Fallback**: Uses the **first** (earliest) version in the array if higher versions don't exist
- **Example**: If `/api/v3.1/ingest/list/for/{sourcesystem}` doesn't exist, it tries `/api/v3/...`

To customize this, modify the `versions` array in `hierarchical-apis.ts`:

```typescript
{
  pathPattern: '/api/v{version}/sourcefiles/{sourcefile}',
  parameterName: 'sourcefile',
  versions: ['2', '3'], // First version (v2) is the fallback
  description: 'Get Sourcefile'
}
```

---

## 🎛️ CLI Options

### Hierarchical Testing Options

| Option | Description | Default |
|--------|-------------|---------|
| `--use-hierarchical` | Enable hierarchical parent-child API testing | `false` |
| `--mode <mode>` | Test mode: `full` (CRUD) or `readonly` (GET only) | `full` |
| `--parallel` | Run tests in parallel | `false` |
| `--max-parallel <n>` | Maximum parallel tests | `5` |

### Notes

- **Cannot combine**: `--use-hierarchical` and `--use-real-data` (hierarchical mode includes real data discovery)
- **Recommended**: Use `--mode readonly` for non-destructive testing
- **Parallel mode**: Not yet supported with hierarchical testing (will be added in future version)

---

## 📈 Benefits

### 1. **Comprehensive Coverage**
- Tests ALL parent resources, not just one
- Catches issues with specific resource IDs that might be missed with placeholder testing

### 2. **Real-World Validation**
- Uses actual data from your API
- Tests real parent-child relationships
- Validates all resource IDs work correctly

### 3. **Version Compatibility**
- Automatically handles version fallback
- Tests that newer versions work with older child APIs
- Ensures backward compatibility

### 4. **Better Debugging**
- Pinpoints which specific resource ID causes failures
- Shows full URL and status codes for all requests
- Detailed JUnit XML reports for CI/CD integration

---

## 🔧 Troubleshooting

### Issue: Too Many Tests

If you have many parent resources, hierarchical testing can generate thousands of tests.

**Solution**: Filter resources in the data discovery phase or use pagination:

```typescript
// In src/lib/data-discovery.ts
const resources = items.slice(0, 5); // Limit to first 5 resources for testing
```

### Issue: Some Child APIs Don't Exist

If a child API doesn't exist in the Swagger spec, it will still be tested directly.

**Expected Behavior**:
```
  ℹ️  Endpoint not in spec, testing directly...
  ✓ GET: 200
  ✅ PASSED (156ms)
```

### Issue: Authentication Failures

Make sure your OAuth2 token has sufficient permissions to access all parent and child APIs.

**Check**:
- Token has read permissions for all API endpoints
- Token is not expired (hierarchical tests can take a long time)

---

## 🎯 Next Steps

1. **Run hierarchical tests** with your API credentials
2. **Review the output** - see how many parent resources and child tests are discovered
3. **Adjust test scope** if needed (filter resources, adjust versions)
4. **Integrate with CI/CD** - use JUnit XML reports in your pipeline

---

## 📝 Example Commands

### Test All Hierarchical Relationships (Readonly)
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

### Test Only Systems Hierarchy
Comment out other hierarchies in `src/lib/hierarchical-apis.ts`:

```typescript
export const HIERARCHICAL_API_DEFINITIONS: ParentApiDefinition[] = [
  // Only test systems hierarchy
  {
    parentPath: '/api/v2/systems',
    // ...
  },
  // Comment out sourcefiles hierarchy
  // {
  //   parentPath: '/api/v2/sourcefiles',
  //   // ...
  // }
];
```

Then run:
```powershell
npm run build
node dist/cli/cli.js test --use-hierarchical ...
```

---

## 🎉 Summary

Hierarchical API Testing provides:
- ✅ Complete parent-child API coverage
- ✅ Real data validation
- ✅ Version fallback support
- ✅ Detailed error reporting
- ✅ CI/CD integration

**Ready to test your hierarchical APIs!** 🚀

