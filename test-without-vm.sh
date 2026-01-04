#!/bin/bash
# test-without-vm.sh
# Test API Contract Guard without VM auto-start functionality

set -e  # Exit on error

echo "🧪 Testing API Contract Guard (VM auto-start disabled)"
echo "═══════════════════════════════════════════════════════"

# Check if VM is up
echo "📡 Checking if VM is accessible..."
if curl -k -s -f https://pdq.swedencentral.cloudapp.azure.com/dev/app/openapi.json > /dev/null 2>&1; then
  echo "✅ VM is running"
else
  echo "❌ VM is down - please start it manually in Azure Portal"
  echo "   VM: vm-pdq-001 in rg-pdq-dev-demo-001"
  exit 1
fi

# Set credentials
export API_USERNAME="backpack"
export API_PASSWORD="7065707061727065707061722d9fbf081779c2784af4b38fbd6278c450b4c3cf3c9e623ac79aaf1c24b87ac3f9c1d920f1ad78b89f43e115dafdf9b97cf650fdb74116d0ba2e7de1757773b3c0f38a40f0b4deb4aeacf01289faa21b5cb0613c07b0892ee4f41c2d15cde4f80c5b71e1b7b0dea61407a72ee98913756a71a033ffff2911fb6595c5f4d9c610dbbd03dc933e4fe1a8d51fd36884179bf83cac60493fac395a25e776432dcc6e"
export NODE_TLS_REJECT_UNAUTHORIZED=0

echo ""
echo "📋 Test 1: List Endpoints"
node dist/cli/cli.js list-endpoints \
  --swagger-url https://pdq.swedencentral.cloudapp.azure.com/dev/app/openapi.json

echo ""
echo "🧪 Test 2: Run Regression Tests"
echo "   (Note: This will test all endpoints. Use Ctrl+C to stop early if needed)"
node dist/cli/cli.js test \
  --swagger-url https://pdq.swedencentral.cloudapp.azure.com/dev/app/openapi.json \
  --token-url https://pdq.swedencentral.cloudapp.azure.com/dev/app/token \
  --username "$API_USERNAME" \
  --password "$API_PASSWORD" \
  --output test-results.xml \
  --no-auto-start-vm

echo ""
echo "✅ All tests complete!"
echo "📄 Results: test-results.xml"

