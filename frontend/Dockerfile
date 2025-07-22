# Multi-stage build for faster Railway deployment
FROM node:18-slim as builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies with timeout and retry
ENV NPM_CONFIG_TIMEOUT=300000
ENV NPM_CONFIG_RETRY=3
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build with memory optimization and relaxed TypeScript settings
ENV NODE_OPTIONS="--max-old-space-size=6144"
ENV CI=false
ENV GENERATE_SOURCEMAP=false
ENV TSC_COMPILE_ON_ERROR=true
ENV SKIP_PREFLIGHT_CHECK=true

# Accept build arguments for API URLs
ARG REACT_APP_API_URL
ARG REACT_APP_SOCKET_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_SOCKET_URL=$REACT_APP_SOCKET_URL

# Debug: Check public directory before build
RUN echo "=== PRE-BUILD DEBUG ===" && \
    echo "Contents of /app:" && \
    ls -la && \
    echo "Contents of /app/public:" && \
    ls -la public/ || echo "No public directory found"

# Build with enhanced error handling - capture all output
RUN echo "Starting React build..." && \
    echo "API URL: $REACT_APP_API_URL" && \
    echo "Socket URL: $REACT_APP_SOCKET_URL" && \
    echo "=== RUNNING NPM BUILD ===" && \
    npm run build || \
    (echo "=== BUILD FAILED - Showing last 50 lines of output ===" && \
     echo "=== Directory listing ===" && \
     ls -la && \
     echo "=== Checking for partial build output ===" && \
     ls -la build/ 2>/dev/null || echo "No build directory created" && \
     exit 1) && \
    echo "=== BUILD COMPLETED ===" && \
    echo "Contents of /app/build:" && \
    ls -la build/ && \
    echo "Checking for index.html:" && \
    test -f build/index.html && echo "✓ index.html found" || (echo "✗ index.html MISSING!" && exit 1)

# Production stage
FROM node:18-slim as production

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy package files and install production dependencies (express)
COPY package*.json ./
RUN npm ci --only=production

# Copy built app from builder stage
COPY --from=builder /app/build ./build

# Copy server file
COPY server.js ./

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
