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

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built CLI from builder
COPY --from=builder /app/dist ./dist

# Make CLI executable
RUN chmod +x /app/dist/cli/cli.js

# Create symlink for global usage
RUN ln -s /app/dist/cli/cli.js /usr/local/bin/api-contract-guard

# Set entrypoint
ENTRYPOINT ["api-contract-guard"]
CMD ["--help"]

