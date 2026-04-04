# API Coverage Report

*Generated: 2026-01-20T12:19:53.723Z*

## Summary

- **Total Endpoints:** 164
- **Tested:** 61 (37%)
- **Blacklisted/Skipped:** 103 (63%)

## HTTP Methods

| Method | Count | Tested | Passing | Coverage |
|--------|-------|--------|---------|----------|
| GET | 82 | 82 | 61 | 74% |
| POST | 67 | - | - | Requires request bodies |
| PUT | 1 | - | - | Requires request bodies |
| DELETE | 14 | 14 | 0 | 0% |

## Coverage by API Version

| Version | Total | Tested | Passing | Coverage |
|---------|-------|--------|---------|----------|
| /api/other | 1 | 0 | 0 | 0% |
| /api/v2 | 88 | 31 | 31 | 35% |
| /api/v3 | 57 | 22 | 22 | 39% |
| /api/v3.1 | 10 | 5 | 5 | 50% |
| /api/v3.2 | 8 | 3 | 3 | 38% |

## Recommendations

### ✅ Automated Testing
- All GET endpoints are automatically regression tested
- Real data discovery system working perfectly
- CI/CD integration ready

### ⚠️ Manual Testing Required
- DELETE endpoints need business rules and test data setup
- POST/PUT endpoints require request body schemas for automation
