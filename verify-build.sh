#!/bin/bash
# Build verification script for API Contract Guard CLI

set -e  # Exit on error

echo "🔍 API Contract Guard - Build Verification"
echo "=========================================="
echo ""

# Step 1: Check Node version
echo "1️⃣  Checking Node.js version..."
node --version
if [ $? -eq 0 ]; then
  echo "   ✅ Node.js detected"
else
  echo "   ❌ Node.js not found"
  exit 1
fi
echo ""

# Step 2: Install dependencies
echo "2️⃣  Installing dependencies..."
npm install
if [ $? -eq 0 ]; then
  echo "   ✅ Dependencies installed"
else
  echo "   ❌ Failed to install dependencies"
  exit 1
fi
echo ""

# Step 3: Build CLI
echo "3️⃣  Building CLI..."
npm run build:cli
if [ $? -eq 0 ]; then
  echo "   ✅ CLI built successfully"
else
  echo "   ❌ Failed to build CLI"
  exit 1
fi
echo ""

# Step 4: Check dist folder
echo "4️⃣  Verifying dist folder..."
if [ -d "dist/cli" ]; then
  echo "   ✅ dist/cli/ directory exists"
else
  echo "   ❌ dist/cli/ directory not found"
  exit 1
fi
echo ""

# Step 5: Check CLI files
echo "5️⃣  Checking CLI files..."
files=(
  "dist/cli/cli.js"
  "dist/cli/blacklist.js"
  "dist/cli/azure-starter.js"
  "dist/cli/orchestrator.js"
  "dist/cli/junit-reporter.js"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✅ $file"
  else
    echo "   ❌ $file not found"
    exit 1
  fi
done
echo ""

# Step 6: Check CLI executable
echo "6️⃣  Checking CLI executable..."
if [ -x "dist/cli/cli.js" ]; then
  echo "   ✅ CLI is executable"
else
  echo "   ⚠️  CLI not executable (attempting to fix...)"
  chmod +x dist/cli/cli.js
  if [ -x "dist/cli/cli.js" ]; then
    echo "   ✅ Fixed: CLI is now executable"
  else
    echo "   ❌ Failed to make CLI executable"
    exit 1
  fi
fi
echo ""

# Step 7: Test CLI help
echo "7️⃣  Testing CLI help..."
node dist/cli/cli.js --help > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "   ✅ CLI help works"
else
  echo "   ❌ CLI help failed"
  exit 1
fi
echo ""

# Step 8: Test commands help
echo "8️⃣  Testing command help..."
commands=("test" "vm-start" "list-endpoints")
for cmd in "${commands[@]}"; do
  node dist/cli/cli.js "$cmd" --help > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "   ✅ $cmd --help works"
  else
    echo "   ❌ $cmd --help failed"
    exit 1
  fi
done
echo ""

# Step 9: Lint check
echo "9️⃣  Running linter..."
npm run lint
if [ $? -eq 0 ]; then
  echo "   ✅ No linter errors"
else
  echo "   ⚠️  Linter found issues (non-blocking)"
fi
echo ""

# Step 10: Build web UI
echo "🔟 Building web UI..."
npm run build
if [ $? -eq 0 ]; then
  echo "   ✅ Web UI built successfully"
else
  echo "   ⚠️  Web UI build failed (CLI still works)"
fi
echo ""

# Summary
echo "=========================================="
echo "✅ Build Verification Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Set environment variables:"
echo "   export API_USERNAME='your-username'"
echo "   export API_PASSWORD='your-password'"
echo ""
echo "2. Run tests:"
echo "   node dist/cli/cli.js test \\"
echo "     --swagger-url https://pdq.swedencentral.cloudapp.azure.com/dev/app/openapi.json \\"
echo "     --token-url https://pdq.swedencentral.cloudapp.azure.com/dev/app/token \\"
echo "     --username \$API_USERNAME \\"
echo "     --password \$API_PASSWORD"
echo ""
echo "3. Or install globally:"
echo "   npm install -g ."
echo "   api-contract-guard --help"
echo ""

