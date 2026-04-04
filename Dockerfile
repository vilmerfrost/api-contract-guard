# Multi-stage build for CLI
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build CLI
RUN npm run build:cli

# Production image
FROM node:18-alpine

RUN apk add --no-cache bash

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built CLI from builder
COPY --from=builder /app/dist ./dist

# Copy pipe entrypoint
COPY pipe/pipe.sh /app/pipe.sh

# Make CLI and pipe executable
RUN chmod +x /app/dist/cli/cli.js /app/pipe.sh

# Create symlink for global usage
RUN ln -s /app/dist/cli/cli.js /usr/local/bin/api-contract-guard

# Default: run as CLI directly. Override with /app/pipe.sh for Bitbucket Pipe mode.
ENTRYPOINT ["api-contract-guard"]
CMD ["--help"]
