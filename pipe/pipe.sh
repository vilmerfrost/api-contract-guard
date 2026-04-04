#!/bin/bash
set -euo pipefail

# Validate required variables
: "${SWAGGER_URL:?'SWAGGER_URL is required'}"
: "${TOKEN_URL:?'TOKEN_URL is required'}"
: "${API_USERNAME:?'API_USERNAME is required'}"
: "${API_PASSWORD:?'API_PASSWORD is required'}"

# Defaults
TEST_MODE="${TEST_MODE:-readonly}"
OUTPUT="${OUTPUT:-test-results/junit.xml}"
PARALLEL="${PARALLEL:-false}"
MAX_PARALLEL="${MAX_PARALLEL:-5}"
AUTO_START_VM="${AUTO_START_VM:-false}"
USE_HIERARCHICAL="${USE_HIERARCHICAL:-false}"
TEST_POSTS="${TEST_POSTS:-false}"
EXTRA_ARGS="${EXTRA_ARGS:-}"

# Build CLI flags
CMD="api-contract-guard test"
CMD="$CMD --swagger-url $SWAGGER_URL"
CMD="$CMD --token-url $TOKEN_URL"
CMD="$CMD --username $API_USERNAME"
CMD="$CMD --password $API_PASSWORD"
CMD="$CMD --mode $TEST_MODE"
CMD="$CMD --output $OUTPUT"

if [ "$PARALLEL" = "true" ]; then
  CMD="$CMD --parallel --max-parallel $MAX_PARALLEL"
fi

if [ "$AUTO_START_VM" = "true" ]; then
  CMD="$CMD --auto-start-vm"
else
  CMD="$CMD --no-auto-start-vm"
fi

if [ "$USE_HIERARCHICAL" = "true" ]; then
  CMD="$CMD --use-hierarchical"
fi

if [ "$TEST_POSTS" = "true" ]; then
  CMD="$CMD --test-posts"
fi

if [ -n "$EXTRA_ARGS" ]; then
  CMD="$CMD $EXTRA_ARGS"
fi

mkdir -p "$(dirname "$OUTPUT")"

echo "Running: $CMD"
eval "$CMD"
