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

# Build with memory optimization and progress output
ENV NODE_OPTIONS="--max-old-space-size=6144"
ENV CI=false
ENV GENERATE_SOURCEMAP=false
RUN echo "Starting React build..." && \
    npm run build && \
    echo "React build completed successfully"

# Production stage
FROM node:18-slim as production

WORKDIR /app

# Install serve globally in production stage
RUN npm install -g serve

# Copy built app from builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Start the application
CMD ["serve", "-s", "build", "-p", "3000"]