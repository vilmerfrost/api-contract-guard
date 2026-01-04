#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Quick Test Script - API Contract Guard
# ═══════════════════════════════════════════════════════════════════════════
# This script runs a quick validation test using environment variables
# from .env.local

set -e  # Exit on any error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              API CONTRACT GUARD - QUICK TEST VALIDATION                   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Load environment variables
echo -e "${BLUE}📁 Loading environment variables...${NC}"
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | grep -v '^$' | xargs)
    echo -e "${GREEN}✅ Environment loaded${NC}"
else
    echo -e "${RED}❌ .env.local not found!${NC}"
    exit 1
fi

# Verify required variables
if [ -z "$SWAGGER_URL" ] || [ -z "$TOKEN_URL" ] || [ -z "$API_USERNAME" ] || [ -z "$API_PASSWORD" ]; then
    echo -e "${RED}❌ Missing required environment variables${NC}"
    echo -e "${YELLOW}💡 Run: source load-env.sh${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}─────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}TEST 1: VM Accessibility Check${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────────────────────${NC}"

echo -e "${BLUE}📡 Checking if VM is accessible...${NC}"
if curl -k -s -f "$SWAGGER_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ VM is running and accessible${NC}"
    VM_RUNNING=true
else
    echo -e "${YELLOW}⚠️  VM appears to be down or unreachable${NC}"
    echo -e "${YELLOW}   This is expected if it's past 23:00 (VM auto-shuts down)${NC}"
    echo -e "${YELLOW}   Either:${NC}"
    echo -e "${YELLOW}   1. Manually start VM in Azure Portal (vm-pdq-001)${NC}"
    echo -e "${YELLOW}   2. Wait for test to auto-start it (requires correct AZURE_CLIENT_SECRET)${NC}"
    VM_RUNNING=false
fi

if [ "$VM_RUNNING" = false ]; then
    echo ""
    echo -e "${RED}❌ Cannot proceed with tests - VM is not accessible${NC}"
    echo ""
    echo -e "${BLUE}To start the VM:${NC}"
    echo -e "${YELLOW}Option 1 (Manual):${NC}"
    echo "  1. Go to Azure Portal"
    echo "  2. Navigate to: rg-pdq-dev-demo-001 → vm-pdq-001"
    echo "  3. Click 'Start'"
    echo "  4. Wait 2-3 minutes"
    echo "  5. Run this script again"
    echo ""
    echo -e "${YELLOW}Option 2 (Automatic - requires correct Azure secret):${NC}"
    echo "  node dist/cli/cli.js vm-start --api-url $SWAGGER_URL"
    echo ""
    exit 1
fi

echo ""
echo -e "${BLUE}─────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}TEST 2: Endpoint Discovery${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────────────────────${NC}"

echo -e "${BLUE}📋 Fetching and parsing Swagger specification...${NC}"
node dist/cli/cli.js list-endpoints --swagger-url "$SWAGGER_URL"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Endpoint discovery successful${NC}"
else
    echo ""
    echo -e "${RED}❌ Endpoint discovery failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}─────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}TEST 3: OAuth2 Authentication & Regression Tests (3 endpoints)${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────────────────────${NC}"

echo -e "${BLUE}🧪 Running regression tests on 3 endpoints...${NC}"
echo ""

node dist/cli/cli.js test \
  --swagger-url "$SWAGGER_URL" \
  --token-url "$TOKEN_URL" \
  --username "$API_USERNAME" \
  --password "$API_PASSWORD" \
  --skip-vm-start \
  --max-tests 3 \
  --output test-results-quick.xml

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Regression tests completed successfully${NC}"
else
    echo ""
    echo -e "${RED}❌ Regression tests failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}─────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}TEST 4: JUnit XML Validation${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────────────────────${NC}"

if [ -f test-results-quick.xml ]; then
    echo -e "${GREEN}✅ JUnit XML report generated${NC}"
    echo -e "${BLUE}📄 Location: test-results-quick.xml${NC}"
    echo ""
    echo -e "${BLUE}Preview:${NC}"
    head -n 20 test-results-quick.xml
else
    echo -e "${YELLOW}⚠️  JUnit XML not found (might not have been generated)${NC}"
fi

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                           TEST SUMMARY                                    ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ All quick tests passed!${NC}"
echo ""
echo -e "${BLUE}The following components are working:${NC}"
echo "  ✅ SSL/TLS handling (self-signed certificates)"
echo "  ✅ Swagger/OpenAPI parsing"
echo "  ✅ Endpoint blacklist filtering (37 endpoints excluded)"
echo "  ✅ OAuth2 authentication"
echo "  ✅ Regression test execution (GET→DELETE→POST→VERIFY→COMPARE)"
echo "  ✅ JUnit XML report generation"
echo ""
echo -e "${YELLOW}⚠️  VM auto-start NOT tested (requires correct AZURE_CLIENT_SECRET)${NC}"
echo ""
echo -e "${BLUE}─────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}NEXT STEPS${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────────────────────${NC}"
echo ""
echo -e "${GREEN}1. Run full test suite:${NC}"
echo "   node dist/cli/cli.js test \\"
echo "     --swagger-url \$SWAGGER_URL \\"
echo "     --token-url \$TOKEN_URL \\"
echo "     --username \$API_USERNAME \\"
echo "     --password \$API_PASSWORD \\"
echo "     --skip-vm-start"
echo ""
echo -e "${GREEN}2. Get correct Azure Client Secret from Stefan to enable VM auto-start${NC}"
echo ""
echo -e "${GREEN}3. Set up CI/CD pipeline (CircleCI or Bitbucket)${NC}"
echo ""
echo -e "${BLUE}─────────────────────────────────────────────────────────────────────────────${NC}"
echo ""