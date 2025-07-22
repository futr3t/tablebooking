# Simple single-stage Dockerfile for Railway
FROM node:18-slim

WORKDIR /app

# Set build environment variables upfront
ENV NODE_OPTIONS="--max-old-space-size=6144"
ENV GENERATE_SOURCEMAP="false" 
ENV CI="false"
ENV NPM_CONFIG_TIMEOUT="300000"

# Copy package files
COPY package*.json ./

# Install dependencies quickly
RUN echo "Installing dependencies..." && \
    npm install --legacy-peer-deps --no-audit --no-fund && \
    echo "Dependencies installed successfully"

# Copy source and build
COPY . .

# Set API URLs
ENV REACT_APP_API_URL=https://kind-benevolence-production.up.railway.app/api
ENV REACT_APP_SOCKET_URL=https://kind-benevolence-production.up.railway.app

# Build with verbose output
RUN echo "Building React app..." && \
    echo "REACT_APP_API_URL=$REACT_APP_API_URL" && \
    echo "REACT_APP_SOCKET_URL=$REACT_APP_SOCKET_URL" && \
    npm run build 2>&1 || true && \
    echo "=== Checking build output ===" && \
    if [ -d build ]; then \
        echo "Build directory exists" && \
        ls -la build/ && \
        if [ -f build/index.html ]; then \
            echo "✓ index.html found"; \
        else \
            echo "✗ index.html missing" && \
            echo "Build directory contains:" && \
            find build -type f | head -20; \
        fi; \
    else \
        echo "No build directory created"; \
    fi

# Install serve and cleanup
RUN npm install -g serve && \
    npm cache clean --force && \
    rm -rf node_modules

# Expose port
EXPOSE 3000

# Start app
CMD ["serve", "-s", "build", "-p", "3000"]