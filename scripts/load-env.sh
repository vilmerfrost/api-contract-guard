#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Environment Variable Loader & Validator
# ═══════════════════════════════════════════════════════════════════════════
# This script loads .env.local and validates all required variables are set
# Usage: source load-env.sh
# Compatible with both bash and zsh

set -a  # Automatically export all variables

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     API CONTRACT GUARD - ENV LOADER                       ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ Error: .env.local not found!${NC}"
    echo -e "${YELLOW}💡 Copy .env.local.template to .env.local and fill in your credentials${NC}"
    exit 1
fi

# Load .env.local
echo -e "${BLUE}📁 Loading .env.local...${NC}"
export $(cat .env.local | grep -v '^#' | grep -v '^$' | xargs)

echo ""
echo -e "${BLUE}🔍 Validating environment variables...${NC}"
echo ""

# Validation function (compatible with both bash and zsh)
validate_var() {
    local var_name=$1
    # Use eval for indirect variable expansion (works in both bash and zsh)
    local var_value
    eval "var_value=\$$var_name"
    local is_required=$2
    local description=$3
    
    if [ -z "$var_value" ]; then
        if [ "$is_required" = "true" ]; then
            echo -e "${RED}❌ MISSING (REQUIRED):${NC} $var_name"
            echo -e "   ${YELLOW}$description${NC}"
            return 1
        else
            echo -e "${YELLOW}⚠️  OPTIONAL (NOT SET):${NC} $var_name"
            return 0
        fi
    elif [[ "$var_value" == *"REPLACE"* ]] || [[ "$var_value" == *"TODO"* ]]; then
        echo -e "${YELLOW}⚠️  PLACEHOLDER:${NC} $var_name"
        echo -e "   ${YELLOW}$description${NC}"
        return 2
    else
        # Mask sensitive values
        if [[ "$var_name" == *"PASSWORD"* ]] || [[ "$var_name" == *"SECRET"* ]]; then
            local masked="${var_value:0:8}...${var_value: -4}"
            echo -e "${GREEN}✅ SET:${NC} $var_name = $masked (masked)"
        else
            echo -e "${GREEN}✅ SET:${NC} $var_name = $var_value"
        fi
        return 0
    fi
}

# Track validation results
MISSING_REQUIRED=0
PLACEHOLDERS=0

echo -e "${BLUE}─────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}API CREDENTIALS (OAuth2)${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────────────────────${NC}"

validate_var "API_USERNAME" true "Username for PDQ API authentication"
MISSING_REQUIRED=$((MISSING_REQUIRED + $?))

validate_var "API_PASSWORD" true "Password for PDQ API authentication"
MISSING_REQUIRED=$((MISSING_REQUIRED + $?))

validate_var "TOKEN_URL" true "OAuth2 token endpoint URL"
MISSING_REQUIRED=$((MISSING_REQUIRED + $?))

echo ""
echo -e "${BLUE}─────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}SWAGGER/API CONFIGURATION${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────────────────────${NC}"

validate_var "SWAGGER_URL" true "Swagger/OpenAPI specification URL"
MISSING_REQUIRED=$((MISSING_REQUIRED + $?))

echo ""
echo -e "${BLUE}─────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}AZURE VM AUTO-START (Optional)${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────────────────────${NC}"

validate_var "AZURE_TENANT_ID" false "Azure Tenant/Directory ID"
validate_var "AZURE_CLIENT_ID" false "Azure Application/Client ID"

validate_var "AZURE_CLIENT_SECRET" false "Azure Client Secret VALUE (not ID!)"
result=$?
if [ $result -eq 2 ]; then
    PLACEHOLDERS=$((PLACEHOLDERS + 1))
    echo -e "   ${YELLOW}⚠️  This is a placeholder! Get the real secret from Stefan.${NC}"
fi

validate_var "AZURE_SUBSCRIPTION_ID" false "Azure Subscription ID"
validate_var "AZURE_RESOURCE_GROUP" false "Azure Resource Group name"
validate_var "AZURE_VM_NAME" false "Azure VM name"

echo ""
echo -e "${BLUE}─────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}SSL/TLS CONFIGURATION${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────────────────────${NC}"

validate_var "NODE_TLS_REJECT_UNAUTHORIZED" false "Disable SSL verification (needed for self-signed certs)"

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                           VALIDATION SUMMARY                              ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $MISSING_REQUIRED -gt 0 ]; then
    echo -e "${RED}❌ CRITICAL: $MISSING_REQUIRED required variables are missing!${NC}"
    echo -e "${RED}   Cannot run tests without these credentials.${NC}"
    echo ""
    exit 1
fi

if [ $PLACEHOLDERS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  WARNING: $PLACEHOLDERS placeholder value(s) detected${NC}"
    echo -e "${YELLOW}   VM auto-start will NOT work until you update these values${NC}"
    echo -e "${YELLOW}   Use --skip-vm-start flag when running tests${NC}"
    echo ""
fi

echo -e "${GREEN}✅ All required variables are set!${NC}"
echo ""
echo -e "${BLUE}─────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}QUICK START COMMANDS${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────────────────────${NC}"
echo ""
echo -e "${GREEN}1. List endpoints:${NC}"
echo "   node dist/cli/cli.js list-endpoints --swagger-url \$SWAGGER_URL"
echo ""
echo -e "${GREEN}2. Run tests (skip VM auto-start):${NC}"
echo "   node dist/cli/cli.js test \\"
echo "     --swagger-url \$SWAGGER_URL \\"
echo "     --token-url \$TOKEN_URL \\"
echo "     --username \$API_USERNAME \\"
echo "     --password \$API_PASSWORD \\"
echo "     --skip-vm-start \\"
echo "     --max-tests 3"
echo ""
echo -e "${GREEN}3. Run full test suite (if VM auto-start is configured):${NC}"
echo "   node dist/cli/cli.js test \\"
echo "     --swagger-url \$SWAGGER_URL \\"
echo "     --token-url \$TOKEN_URL \\"
echo "     --username \$API_USERNAME \\"
echo "     --password \$API_PASSWORD"
echo ""
echo -e "${BLUE}─────────────────────────────────────────────────────────────────────────────${NC}"
echo ""

set +a  # Stop auto-exporting

# If placeholders detected, remind user
if [ $PLACEHOLDERS -gt 0 ]; then
    echo -e "${YELLOW}💡 REMINDER: Update AZURE_CLIENT_SECRET in .env.local to enable VM auto-start${NC}"
    echo -e "${YELLOW}   Contact Stefan to get the correct Client Secret VALUE${NC}"
    echo ""
fi